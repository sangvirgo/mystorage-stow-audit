The last thing I built with an AI coding tool is this assignment: a Playwright harness that audits Stow one message at a time, and a small evaluation for a grounded-answer prototype, both built with Claude Code.

What I had to fix myself:

- The first harness decided a reply was finished when the page text had not changed for five seconds. Stow shows "thinking" for longer, so it closed the browser and lost a real reply. I had to work out how the stop button behaves and rebuild completion around it.
- Its early findings were too strong. It rated a 10% discount and a deposit as possibly invented; the public FAQ said otherwise. I checked the pages and downgraded or withdrew them, and I removed a responsive claim I could not reproduce by hand.
- It proposed Gemini embeddings for twelve short source chunks. I asked whether that was needed, and we dropped it.
- The first prototype compared Stow's recorded replies with a different model, which proves little. I asked for the same model and sources, a plain prompt against the pipeline, and a held-out set written before tuning.
- Some of its regex checks scored correct answers as failures. I found them by reading the answers, fixed them, and listed the ones left in the README instead of editing the numbers.

The rule I kept: read the output, not the score.
