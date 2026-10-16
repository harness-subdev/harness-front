import Foundation
import ScreenCaptureKit
import AVFoundation
import AppKit
import CoreGraphics

struct CaptureError: Error, CustomStringConvertible {
    let description: String
}

struct RecordOptions {
    let windowID: CGWindowID
    let outputURL: URL
    let durationNanoseconds: UInt64
    let width: Int
    let height: Int
    let fps: Int32

    init(arguments: [String]) throws {
        guard arguments.count == 7 else {
            throw CaptureError(description: "Usage: capture-window record WINDOW_ID OUTPUT.mp4 SECONDS WIDTH_PX HEIGHT_PX FPS")
        }
        guard let windowID = UInt32(arguments[1]), windowID > 0 else {
            throw CaptureError(description: "Window ID must be a positive UInt32.")
        }
        guard let seconds = Double(arguments[3]), seconds.isFinite,
              seconds > 0, seconds * 1_000_000_000 >= 1,
              seconds * 1_000_000_000 < Double(UInt64.max) else {
            throw CaptureError(description: "Duration must be finite, positive, and representable in nanoseconds.")
        }
        guard let width = Int(arguments[4]), width > 0,
              width <= Int32.max, width.isMultiple(of: 2) else {
            throw CaptureError(description: "Width must be a positive even pixel count within Int32 range for H.264.")
        }
        guard let height = Int(arguments[5]), height > 0,
              height <= Int32.max, height.isMultiple(of: 2) else {
            throw CaptureError(description: "Height must be a positive even pixel count within Int32 range for H.264.")
        }
        guard let fps = Int32(arguments[6]), fps > 0 else {
            throw CaptureError(description: "FPS must be a positive Int32 integer.")
        }
        guard !arguments[2].contains("\0") else {
            throw CaptureError(description: "Output .mp4 path cannot contain a null character.")
        }
        let outputURL = URL(fileURLWithPath: arguments[2])
        guard outputURL.pathExtension.lowercased() == "mp4" else {
            throw CaptureError(description: "Output must have a .mp4 extension.")
        }
        let files = FileManager.default
        guard !files.fileExists(atPath: outputURL.path),
              (try? files.destinationOfSymbolicLink(atPath: outputURL.path)) == nil else {
            throw CaptureError(description: "Output already exists: \(outputURL.path)")
        }
        var parentIsDirectory: ObjCBool = false
        guard files.fileExists(atPath: outputURL.deletingLastPathComponent().path, isDirectory: &parentIsDirectory),
              parentIsDirectory.boolValue else {
            throw CaptureError(description: "Output parent directory must already exist.")
        }

        self.windowID = windowID
        self.outputURL = outputURL
        self.durationNanoseconds = UInt64(seconds * 1_000_000_000)
        self.width = width
        self.height = height
        self.fps = fps
    }
}

final class Recording: NSObject, SCRecordingOutputDelegate {
    private let lock = NSLock()
    private var started = false
    private var result: Result<Void, any Error>?

    var completion: Result<Void, any Error>? {
        lock.withLock { result }
    }

    func recordingOutputDidStartRecording(_ recordingOutput: SCRecordingOutput) {
        lock.withLock { started = true }
    }

    func waitUntilStarted() async throws {
        for attempt in 0...50 {
            let state = lock.withLock { (started: started, completion: result) }
            if let completion = state.completion {
                try completion.get()
                throw CaptureError(description: "Recording finished before startup was confirmed.")
            }
            if state.started { return }
            if attempt < 50 {
                try await Task.sleep(nanoseconds: 100_000_000)
            }
        }
        throw CaptureError(description: "Recording startup timed out after five seconds.")
    }

    func recordingOutputDidFinishRecording(_ recordingOutput: SCRecordingOutput) {
        lock.withLock {
            if result == nil {
                result = .success(())
            }
        }
    }

    func recordingOutput(_ recordingOutput: SCRecordingOutput, didFailWithError error: any Error) {
        lock.withLock { result = .failure(error) }
    }
}

#if !CAPTURE_LIFECYCLE_CHECK
@main
#endif
struct Capture {
    static let help = """
    Usage:
      capture-window --help
      capture-window list
      capture-window record WINDOW_ID OUTPUT.mp4 SECONDS WIDTH_PX HEIGHT_PX FPS

    list and record require current task authorization and existing macOS Screen
    Recording permission. This helper checks permission; it never requests it.
    Permission alone does not authorize a recording. Select the exact Chrome
    window from list after checking its profile, URL, and content in Chrome.

    record captures only the selected Chrome window, without audio, shadow, or
    cursor. Supply measured source pixel dimensions and FPS; no DPR is assumed.
    H.264 dimensions must be positive and even. The .mp4 output must not exist,
    and its parent directory must exist. Failed recordings may leave a partial
    raw sibling file at the path reported on stderr. Requires macOS 15 or newer
    and a current macOS SDK with SCRecordingOutput support.
    """

    @MainActor
    static func main() async {
        var rawURL: URL?
        do {
            let arguments = Array(CommandLine.arguments.dropFirst())
            if arguments == ["--help"] {
                print(help)
                return
            }
            let options: RecordOptions?
            if arguments == ["list"] {
                options = nil
            } else if arguments.first == "record" {
                options = try RecordOptions(arguments: arguments)
            } else {
                throw CaptureError(description: "Usage: capture-window --help | list | record WINDOW_ID OUTPUT.mp4 SECONDS WIDTH_PX HEIGHT_PX FPS")
            }

            _ = NSApplication.shared
            guard CGPreflightScreenCaptureAccess() else {
                throw CaptureError(description: "Existing macOS Screen Recording permission is required. Grant it manually in System Settings before an authorized capture; this helper never requests it.")
            }
            let content = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: false)
            let windows = content.windows.filter {
                $0.owningApplication?.bundleIdentifier == "com.google.Chrome"
            }
            guard let options else {
                for window in windows {
                    print("\(window.windowID) | \(window.frame) | \(window.title ?? "")")
                }
                return
            }
            guard let window = windows.first(where: { $0.windowID == options.windowID }) else {
                throw CaptureError(description: "Selected Chrome window \(options.windowID) was not found. Refresh list and verify the exact target.")
            }

            let config = SCStreamConfiguration()
            config.width = options.width
            config.height = options.height
            config.minimumFrameInterval = CMTime(value: 1, timescale: options.fps)
            config.showsCursor = false
            config.capturesAudio = false
            config.captureMicrophone = false
            config.ignoreShadowsSingleWindow = true
            let stream = SCStream(
                filter: SCContentFilter(desktopIndependentWindow: window),
                configuration: config,
                delegate: nil
            )
            // A unique sibling plus an atomic hard link prevents overwriting a
            // destination created while recording. Keep raw output on failure.
            let recordingURL = options.outputURL.deletingLastPathComponent()
                .appendingPathComponent(".capture-window-\(UUID().uuidString).mp4")
            rawURL = recordingURL
            let recordingConfig = SCRecordingOutputConfiguration()
            recordingConfig.outputURL = recordingURL
            recordingConfig.outputFileType = .mp4
            recordingConfig.videoCodecType = .h264
            let delegate = Recording()
            let output = SCRecordingOutput(configuration: recordingConfig, delegate: delegate)
            try stream.addRecordingOutput(output)
            try await stream.startCapture()

            var streamError: (any Error)?
            do {
                try await delegate.waitUntilStarted()
                print("RECORDING \(window.windowID) \(window.title ?? "") \(Date().timeIntervalSince1970)")
                fflush(stdout)
                try await Task.sleep(nanoseconds: options.durationNanoseconds)
                try await stream.stopCapture()
            } catch {
                streamError = error
                try? await stream.stopCapture()
            }
            // ponytail: poll only for the five-second finalization boundary;
            // a continuation is unnecessary for this one-shot command.
            for _ in 0..<50 {
                if delegate.completion != nil { break }
                try await Task.sleep(nanoseconds: 100_000_000)
            }
            guard let completion = delegate.completion else {
                if let streamError { throw streamError }
                throw CaptureError(description: "Recording finalization timed out after five seconds.")
            }
            try completion.get()
            if let streamError { throw streamError }
            let files = FileManager.default
            let attributes = try files.attributesOfItem(atPath: recordingURL.path)
            guard let bytes = attributes[.size] as? NSNumber, bytes.uint64Value > 0 else {
                throw CaptureError(description: "Recording finished without a nonempty output file.")
            }
            try files.linkItem(at: recordingURL, to: options.outputURL)
            do {
                try files.removeItem(at: recordingURL)
            } catch {
                fputs("Raw sibling retained: \(recordingURL.path) (\(error))\n", stderr)
            }
            print("SAVED \(options.outputURL.path)")
        } catch {
            fputs("ERROR: \(error)\n", stderr)
            if let rawURL, FileManager.default.fileExists(atPath: rawURL.path) {
                fputs("Partial raw recording retained: \(rawURL.path)\n", stderr)
            }
            exit(1)
        }
    }
}
