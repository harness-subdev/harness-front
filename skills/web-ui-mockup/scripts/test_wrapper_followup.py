"""Run with python3; uses only temporary state and bounded subprocesses."""

import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
from concurrent.futures import ThreadPoolExecutor


SCRIPT = Path(__file__).with_name("wrapper_followup.py")


def run(args, payload, env, expected_code=0):
    result = subprocess.run(
        [sys.executable, str(SCRIPT), *args],
        input=json.dumps(payload),
        text=True,
        capture_output=True,
        env=env,
        timeout=5,
    )
    assert result.returncode == expected_code, (
        f"{args}: expected exit {expected_code}, got {result.returncode}: "
        f"{result.stderr[:500]}"
    )
    assert len(result.stdout) < 32768, "Hook output must stay bounded"
    return json.loads(result.stdout) if result.stdout.strip() else {}


def main():
    with tempfile.TemporaryDirectory(prefix="wrapper-followup-check-") as directory:
        root = Path(directory)
        artifact_a = root / "variant-a.png"
        artifact_b = root / "variant-b.png"
        artifact_a.write_bytes(b"reviewed preview A")
        artifact_b.write_bytes(b"reviewed preview B")
        env = {
            **os.environ,
            "CODEX_THREAD_ID": "test-ui-thread",
            "CODEX_UI_WRAPPER_STATE_DIR": str(root / "state"),
        }
        event = {"session_id": "test-ui-thread", "turn_id": "turn-1"}
        stop = {**event, "hook_event_name": "Stop", "stop_hook_active": False}
        prompt = {
            **event,
            "hook_event_name": "UserPromptSubmit",
            "prompt": "Show variants",
        }
        delivery = {
            "delivery_id": "settings-v1",
            "skill": "web-ui-mockup",
            "candidates": [
                {
                    "variant": "A",
                    "kind": "component",
                    "summary": "Compact settings card",
                    "artifacts": [str(artifact_a)],
                },
                {
                    "variant": "B",
                    "kind": "interaction",
                    "ui_role": "RouteTransition",
                    "summary": "Route transition",
                    "artifacts": [str(artifact_b)],
                },
            ],
        }
        message = f"![A]({artifact_a})\n![B]({artifact_b})"

        default_env = {
            key: value
            for key, value in env.items()
            if key != "CODEX_UI_WRAPPER_STATE_DIR"
        }
        default_env["CODEX_THREAD_ID"] = f"sandbox-check-{root.name}"
        default_record = run(["record"], delivery, default_env)
        default_state = Path(default_record["state_file"])
        try:
            assert default_state.is_file(), (
                "The default marker location must be writable inside the tool sandbox"
            )
        finally:
            default_state.unlink(missing_ok=True)
            default_state.with_suffix(".json.lock").unlink(missing_ok=True)

        assert run(["hook"], prompt, env) == {}, (
            "A new task must not offer registration"
        )
        assert run(["hook"], stop, env) == {}, "Reading skills alone must not trigger"
        assert not (root / "state").exists(), (
            "Non-UI chats must not create follow-up state"
        )
        recorded = run(["record"], delivery, env)
        assert recorded.get("status") == "pending", (
            "Delivery must wait for visual handoff"
        )
        assert run(["hook"], stop, env) == {}, "No final visual handoff means no offer"
        assert run(["record"], delivery, env).get("status") == "pending", (
            "Retry must be idempotent"
        )

        reply = run(["hook"], {**stop, "last_assistant_message": message}, env)
        assert reply.get("decision") == "block", (
            "Delivered designs must get a next-message offer"
        )
        reason = reply.get("reason", "")
        assert "settings-v1" in reason and "RouteTransition" in reason, (
            "Offer must retain scoped candidates"
        )
        assert str(artifact_a) in reason and str(artifact_b) in reason, (
            "Offer must retain artifact references"
        )
        assert "wrapper-registration.md" in reason, (
            "Approval workflow must remain discoverable"
        )
        assert run(["hook"], {**stop, "last_assistant_message": message}, env) == {}, (
            "Same delivery must not offer twice"
        )
        assert run(["record"], delivery, env).get("status") == "already_offered", (
            "Record retry must not resurrect an offer"
        )

        synthetic = {**prompt, "prompt": reason}
        assert run(["hook"], synthetic, env) == {}, (
            "Automatic continuation must not consume the human reply context"
        )
        decline = run(
            ["hook"],
            {**prompt, "turn_id": "turn-2", "prompt": "No, skip registration"},
            env,
        )
        context = decline.get("hookSpecificOutput", {}).get("additionalContext", "")
        assert "settings-v1" in context, (
            "Human reply must get the exact previous offer context"
        )
        assert (
            run(
                ["hook"],
                {**stop, "turn_id": "turn-2", "last_assistant_message": "Declined"},
                env,
            )
            == {}
        ), "Decline must not re-offer"
        assert (
            run(
                ["hook"],
                {**prompt, "turn_id": "turn-3", "prompt": "Unrelated task"},
                env,
            )
            == {}
        ), "Old offer must not follow unrelated prompts"

        next_delivery = {
            **delivery,
            "delivery_id": "settings-v2",
            "skill": "prototype-ui",
        }
        run(["record"], next_delivery, env)
        active_stop = {
            **stop,
            "turn_id": "turn-3",
            "stop_hook_active": True,
            "last_assistant_message": message,
        }
        assert run(["hook"], active_stop, env) == {}, "Stop continuation must not loop"
        assert (
            run(["hook"], {**active_stop, "stop_hook_active": False}, env).get(
                "decision"
            )
            == "block"
        ), "A new delivery must allow a new offer"
        approve = run(
            ["hook"], {**prompt, "turn_id": "turn-4", "prompt": "Register B only"}, env
        )
        assert "settings-v2" in approve.get("hookSpecificOutput", {}).get(
            "additionalContext", ""
        ), "Approval must identify the offered delivery"

        stale = {**delivery, "delivery_id": "interrupted-v1"}
        run(["record"], stale, env)
        run(["hook"], {**prompt, "turn_id": "turn-5", "prompt": "Different task"}, env)
        assert (
            run(
                ["hook"],
                {**stop, "turn_id": "turn-5", "last_assistant_message": message},
                env,
            )
            == {}
        ), "Interrupted delivery must not leak into a later task"

        invalid = {**delivery, "delivery_id": "bad-logic", "skill": "prototype-logic"}
        run(["record"], invalid, env, expected_code=1)
        run(["record"], {**delivery, "skill": []}, env, expected_code=1)
        invalid_candidate = {**delivery["candidates"][0], "kind": "page-transition"}
        run(
            ["record"],
            {**delivery, "candidates": [invalid_candidate]},
            env,
            expected_code=1,
        )
        run(
            ["record"],
            {**delivery, "candidates": [{**invalid_candidate, "kind": []}]},
            env,
            expected_code=1,
        )
        missing = {
            **delivery["candidates"][0],
            "artifacts": [str(root / "missing.png")],
        }
        run(["record"], {**delivery, "candidates": [missing]}, env, expected_code=1)
        assert run(["hook"], {**stop, "last_assistant_message": message}, env) == {}, (
            "Invalid markers must not register pending work"
        )

        no_session = {
            key: value
            for key, value in env.items()
            if key not in ("CODEX_THREAD_ID", "CODEX_SESSION_ID")
        }
        run(["record"], delivery, no_session, expected_code=1)
        assert (
            run(
                ["hook"],
                {
                    **stop,
                    "session_id": "different-thread",
                    "last_assistant_message": message,
                },
                env,
            )
            == {}
        ), "Threads must not share candidates"

        run(["record"], {**delivery, "delivery_id": "parallel-v1"}, env)
        concurrent_stop = {
            **stop,
            "turn_id": "turn-5",
            "last_assistant_message": message,
        }
        with ThreadPoolExecutor(max_workers=2) as executor:
            futures = [
                executor.submit(run, ["hook"], concurrent_stop, env) for _ in range(2)
            ]
            decisions = [future.result(timeout=6).get("decision") for future in futures]
        assert decisions.count("block") == 1, (
            "Concurrent Stop events must claim a delivery only once"
        )

        preview_a = "http://localhost:3000/settings?variant=A"
        preview_ab = "http://localhost:3000/settings?variant=AB"
        url_candidates = [
            {**delivery["candidates"][0], "variant": "A", "artifacts": [preview_a]},
            {**delivery["candidates"][1], "variant": "AB", "artifacts": [preview_ab]},
        ]
        run(
            ["record"],
            {**delivery, "delivery_id": "urls-v1", "candidates": url_candidates},
            env,
        )
        url_stop = {**concurrent_stop, "last_assistant_message": f"[AB]({preview_ab})"}
        assert run(["hook"], url_stop, env) == {}, (
            "A longer variant URL must not prove delivery of its prefix variant"
        )
        url_stop["last_assistant_message"] = f"[A]({preview_a}) [AB]({preview_ab})"
        assert run(["hook"], url_stop, env).get("decision") == "block", (
            "Both exact variant links must prove delivery"
        )

        hooks_file = root / "hooks.json"
        legacy = {
            "description": "keep metadata",
            "hooks": {
                "Stop": [{"hooks": [{"type": "command", "command": "legacy-hook"}]}]
            },
        }
        original = json.dumps(legacy)
        hooks_file.write_text(original)
        installed = run(["install", "--hooks-file", str(hooks_file)], {}, env)
        config = json.loads(hooks_file.read_text())
        assert config.get("description") == "keep metadata", (
            "Installer must preserve unrelated metadata"
        )
        assert config["hooks"]["Stop"][0] == legacy["hooks"]["Stop"][0], (
            "Existing hook indexes must stay stable"
        )
        assert len(config["hooks"]["Stop"]) == 2, "Install must append one Stop handler"
        assert len(config["hooks"]["UserPromptSubmit"]) == 1, (
            "Install must append the human reply handler"
        )
        assert Path(installed["backup"]).read_text() == original, (
            "Install must retain a recoverable backup"
        )
        before_retry = hooks_file.read_bytes()
        assert (
            run(["install", "--hooks-file", str(hooks_file)], {}, env)["added"] == []
        ), "Install retry must not duplicate handlers"
        assert hooks_file.read_bytes() == before_retry, (
            "Install retry must preserve configuration bytes"
        )

        # Registration is deliberately outside the hook's authority.
        assert not any(root.glob("**/*.tgz")), "Hook must not produce packages"
        assert not any(root.glob("**/catalog*.json")), "Hook must not mutate a catalog"
        print(
            "PASS: delivery, next-message offer, deduplication, reply context, stale-work cleanup, validation, and thread isolation"
        )


if __name__ == "__main__":
    main()
