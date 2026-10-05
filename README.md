# Algebra Tune-Up

A remediation web app for Ontario MTH1W (Grade 9 de-streamed) students who are missing two foundational algebra skills:

1. **Collecting Like Terms**
2. **The Distributive Property**

Each module has an 8-step guided lesson with instant-feedback checks, followed by levelled practice (Mild → Medium → Spicy) that adapts to the student and diagnoses common misconceptions.

Aligned to curriculum expectation **C1.4** (simplify algebraic expressions by applying properties of operations), with supporting use of substitution from **C1.3**.

## Features

- **Colour coding:** every kind of term keeps one colour throughout (x-terms blue, constants orange, x² purple, y green, xy/ab teal). The multiplier outside brackets is pink, with arrows to each term inside.
- **Scaffolded lessons:** algebra tiles, area models, substitution checks and "spot the mistake" questions, written for students meeting the topic for the first time.
- **Adaptive practice:**
  - Five first-try correct answers unlock the next level. Viewing the full solution removes one; fixing an answer on a retry leaves the meter unchanged.
  - Two misses in a row open the next problem in guided step-by-step mode. Three misses offer a step back to the previous level.
  - New problems are weighted toward the student's recent mistakes.
- **Misconception feedback:** recognises only multiplying the first term, a negative not reaching every term, x × x = 2x, order-of-operations errors (5 − 3(x − 2)), ignored minus signs, the invisible 1, combining unlike terms, raising the exponent when adding, and unfinished simplifying.
- **"Break it down":** splits any question into individually checked steps.
- **Teacher panel:** on the home page, with curriculum notes, a level overview, "Unlock all levels" and a progress reset.

## Files

```
index.html        page shell
css/styles.css    all styles (light and dark themes)
js/engine.js      algebra engine: parser, problem generators, misconception diagnosis (no DOM code)
js/app.js         lessons, practice flow and interface
.nojekyll         tells GitHub Pages to serve files as-is
```

There's no build step and nothing to install. The only external resource is Google Fonts, and the app falls back to system fonts if they can't load.

## Publish with GitHub Pages

1. Create a new repository on GitHub (for example, `algebra-tune-up`).
2. Upload everything in this folder to the repository root, including `.nojekyll`. Use **Add file → Upload files**, or push with git.
3. Go to **Settings → Pages**. Under "Build and deployment", choose **Deploy from a branch**, then select `main` and `/ (root)`. Save.
4. After a minute or two, the site will be live at `https://<your-username>.github.io/algebra-tune-up/`.

To try it locally, open `index.html` in a browser.

## Notes

- **Progress storage:** progress is saved in the browser's `localStorage`. It stays on that device and browser only, with no accounts and no data sent anywhere. Clearing browser data resets it.
- **Direct links:**
  - `#like-learn` and `#like-practice` open the Collecting Like Terms lesson and practice.
  - `#dist-learn` and `#dist-practice` do the same for the Distributive Property.
  - Example: `https://<your-username>.github.io/algebra-tune-up/#dist-practice`
- **Editing content:**
  - Lesson text and checks are in `TUT` in `js/app.js`.
  - Practice problem templates for each level are in `GEN` in `js/engine.js`. Each template returns a string such as `"-3(x - 4)"`, and the engine works out the answer and the typical wrong answers automatically.
