#!/usr/bin/env python3
"""Check delegate lifecycle and CLI rejection; never enumerate or record."""

import pathlib
import subprocess
import tempfile


def main():
    source = pathlib.Path(__file__).with_name("capture-window.swift")
    assert source.is_file(), "capture-window.swift is missing"

    with tempfile.TemporaryDirectory(prefix="capture-window-check-") as temporary:
        work = pathlib.Path(temporary)
        binary = work / "capture-window"
        compile_command = [
            "xcrun", "swiftc", "-parse-as-library",
            "-module-cache-path", str(work / "modules"),
            str(source), "-o", str(binary),
        ]
        print("Compile:", " ".join(compile_command), flush=True)
        subprocess.run(compile_command, check=True)

        harness = work / "RecordingCheck.swift"
        harness.write_text(r'''
import Foundation
import ScreenCaptureKit

@main struct RecordingCheck {
    @MainActor static func main() async throws {
        let configuration = SCRecordingOutputConfiguration()
        configuration.outputURL = URL(fileURLWithPath: "/unused-recording-check.mp4")
        let pending = Recording()
        let output = SCRecordingOutput(configuration: configuration, delegate: pending)
        var enteredWait = false
        var ready = false
        let waiting = Task {
            enteredWait = true
            try await pending.waitUntilStarted()
            ready = true
        }
        try await Task.sleep(nanoseconds: 150_000_000)
        precondition(enteredWait && !ready, "Recording must stay pending before didStart")
        pending.recordingOutputDidStartRecording(output)
        try await waiting.value
        precondition(ready, "The actual start callback must release the wait")

        let failed = Recording()
        let expected = NSError(domain: "RecordingCheck", code: 73)
        failed.recordingOutput(output, didFailWithError: expected)
        do {
            try await failed.waitUntilStarted()
            preconditionFailure("Failure before start must be propagated")
        } catch {
            precondition((error as NSError).domain == expected.domain)
            precondition((error as NSError).code == expected.code)
        }
        failed.recordingOutputDidFinishRecording(output)
        guard let failure = failed.completion else {
            preconditionFailure("Recording failure disappeared")
        }
        do {
            try failure.get()
            preconditionFailure("Finish must not convert failure into success")
        } catch {
            precondition((error as NSError).domain == expected.domain)
            precondition((error as NSError).code == expected.code)
        }

        let premature = Recording()
        premature.recordingOutputDidFinishRecording(output)
        do {
            try await premature.waitUntilStarted()
            preconditionFailure("Finish before readiness must fail")
        } catch let error as CaptureError {
            precondition(error.description.contains("finished before"))
        }
        print("PASS: delegate waits for actual start and preserves recording failures")
    }
}
''')
        lifecycle_binary = work / "recording-check"
        lifecycle_compile = [
            "xcrun", "swiftc", "-parse-as-library",
            "-module-cache-path", str(work / "modules"),
            "-D", "CAPTURE_LIFECYCLE_CHECK", str(source), str(harness),
            "-o", str(lifecycle_binary),
        ]
        print("Compile lifecycle:", " ".join(lifecycle_compile), flush=True)
        subprocess.run(lifecycle_compile, check=True)
        subprocess.run([str(lifecycle_binary)], check=True, timeout=10)

        help_result = subprocess.run(
            [str(binary), "--help"], capture_output=True, text=True, timeout=10
        )
        assert help_result.returncode == 0, help_result.stderr
        assert "record WINDOW_ID OUTPUT.mp4 SECONDS WIDTH_PX HEIGHT_PX FPS" in help_result.stdout
        assert "authorization" in help_result.stdout.lower()
        assert "permission" in help_result.stdout.lower()

        output = work / "new.mp4"
        record = ["record", "123", str(output), "1", "1920", "1080", "30"]

        def rejects(arguments, reason):
            result = subprocess.run(
                [str(binary), *arguments], capture_output=True, text=True, timeout=10
            )
            assert result.returncode != 0, f"Accepted invalid input: {arguments}"
            assert "SAVED" not in result.stdout + result.stderr
            assert "ERROR:" in result.stderr, result.stderr
            assert reason in result.stderr.lower(), (arguments, result.stderr)
            assert not output.exists(), f"Invalid input created {output}"

        for arguments in ([], ["unknown"], ["--help", "extra"], ["list", "extra"], record[:-1], record + ["extra"]):
            rejects(arguments, "usage")

        # Removing validation must fail these checks before any screen access.
        invalid_fields = {
            1: ("window", ["0", "-1", "4294967296", "abc"]),
            3: ("duration", ["0", "-1", "nan", "inf", "-inf", "1e100", "abc"]),
            4: ("width", ["0", "-2", "1919", "2147483648", "999999999999999999999", "abc"]),
            5: ("height", ["0", "-2", "1079", "2147483648", "999999999999999999999", "abc"]),
            6: ("fps", ["0", "-1", "1.5", "2147483648", "abc"]),
        }
        for index, (reason, values) in invalid_fields.items():
            for value in values:
                arguments = record.copy()
                arguments[index] = value
                rejects(arguments, reason)

        for path, reason in (
            (work / "new.mov", ".mp4"),
            (work / "missing" / "new.mp4", "parent"),
        ):
            arguments = record.copy()
            arguments[2] = str(path)
            rejects(arguments, reason)

        existing = work / "existing.mp4"
        existing.write_bytes(b"preserve existing recording")
        dangling = work / "dangling.mp4"
        dangling.symlink_to(work / "absent.mp4")
        for path in (existing, dangling):
            arguments = record.copy()
            arguments[2] = str(path)
            rejects(arguments, "exists")
        assert existing.read_bytes() == b"preserve existing recording"
        assert dangling.is_symlink() and not dangling.exists()

    print("PASS: compile, delegate lifecycle, help, malformed CLI rejection, and output preservation (no capture)")


if __name__ == "__main__":
    main()
