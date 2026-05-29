/** Step 2 system addendum — preview sketch guardrails aligned with arduinoResourceRouter. */
export const STEP2_FIRMWARE_SYSTEM = `FIRMWARE PREVIEW RULES (electronic puzzles only):
- Populate hardware_pinout_map BEFORE writing arduinoCode — every switch, relay, LED, and sensor role gets an explicit Uno pin (D2–D13, A0–A5, or 5V/GND labels).
- arduinoCode is a PREVIEW aligned with production routing: use ONLY Arduino core APIs unless parts explicitly name MPR121 or MFRC522 (then Wire.h + that module's header only).
- Standardization: use pinMode(PIN, INPUT_PULLUP) for all switches and buttons — never INPUT_PULLDOWN or bare INPUT for player-facing switches.
- State management: loop() MUST use non-blocking millis() timing — no delay() over 50 ms; avoid delay() entirely except tiny debounce ticks if absolutely required.
- Declare pins as const int or #define matching hardware_pinout_map; include setup() and a non-empty loop().`;
