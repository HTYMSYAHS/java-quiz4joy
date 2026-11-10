# Java Syntax Recall

Active-recall practice for **Introduction to Programming** (Java). Version 2 keeps the original Practice and Test modes and adds a multi-file code page, guided builds, syntax highlighting, a missing-context check, and a tutor that never stores an API key in the repo.

The question bank is self-contained. If an answer depends on a field, method, or variable, that name is written in the prompt or the snippet. `npm run check-questions` enforces the rule, and the same check runs in the page and on every question the tutor tries to add.

## Question bank

| Topic | Questions |
| --- | ---: |
| Basics & Scanner | 20 |
| Selection & Validation | 10 |
| Loops | 10 |
| Strings & Chars | 17 |
| 1D Arrays | 10 |
| 2D Arrays | 12 |
| Methods | 8 |
| Instantiable Classes | 28 |
| Mixed / Full Pattern | 8 |
| **Total** | **123** |

Five of the instantiable-class questions are multi-file tasks (`Student` / `StudentTest`, `Box` / `BoxTest`, `BankAccount` / `BankApp`, `Book` / `BookApp`, `ModuleResult` / `ModuleApp`). They open in the code page. The grader compiles your class with its own driver, so the method names in the prompt have to match.

Guided builds, shortest first:

1. Say hello — `main`, `Scanner`, `nextLine`
2. Validate a mark — range check, then Pass / Fail
3. Sum from 1 to n — a `for` loop
4. A `Box` — private fields, a constructor with `this`, setters, `computeVolume`, `toString`, then `BoxTest`
5. Two students — average, a grade ladder, and a driver that builds both objects

## Run it locally

The page is static, but the scripts are ES modules, so open it through a local server rather than as a file.

```bash
npm start
```

That serves the folder at [http://127.0.0.1:43123](http://127.0.0.1:43123). Any static server works:

```bash
python3 -m http.server 43123
```

Check the bank (no browser required):

```bash
npm run check-questions
```

The script fails if a user-defined name in an answer is missing from that question, if a topic has fewer than five questions, or if a guided-build reference solution no longer matches its steps. Java keywords and introductory JDK names (`nextInt`, `println`, `String`, `length`, `parseInt`, and the rest listed in `question-check.js`) are treated as syntax recall, not missing context.

Rebuild the editor bundle only if you change `src/cm-entry.js`:

```bash
npm install
npm run build:editor
```

The built file is `vendor/codemirror.js`. You do not need Node to use the site.

## What is on the page

- **Quiz.** Practice shows the explanation immediately. Test stays quiet until the end and stops at 15 questions. Stats stay in `localStorage`.
- **Code.** One main file plus up to five other `.java` files, with Java highlighting. Run and Check send the sources to a sandbox.
- **Guided build.** Each step has instructions, a hint you open yourself, and a check. Later steps keep the earlier rules. The last step of a program also runs it.
- **Tutor.** Hints, error explanations, and code review. With no key, the built-in hints and the compiler notes still work.

## Tutor key

Open **Tutor → Settings**. The key is written only to this browser's `localStorage` (`javaRecall.ai`). It is not in the repository, and the page sends it only to the provider you choose.

- **Google Gemini** works from the browser with a key from [Google AI Studio](https://aistudio.google.com/apikey). The default model is `gemini-2.5-flash`. Change the model field if Google retires that id.
- **OpenAI-compatible** posts to `/chat/completions`. The default base URL is `https://api.openai.com/v1`. If that host blocks the page, set the base URL to `https://openrouter.ai/api/v1` and use an OpenRouter key. Both of those endpoints allow browser calls.

A drafted or edited question is not added when you ask for it. The page runs the missing-context check first and refuses the draft if a name is missing. If the check passes, the draft's test program is compiled in the sandbox. **Apply** is enabled only after both succeed. **Undo** restores the previous bank. **Restore the original question bank** in Settings does the same, and it can be undone too.

## Sandbox

Programs run on the public [Judge0 CE](https://ce.judge0.com/) instance, language id 89 (multi-file program). A small zip carries `compile` and `run` scripts plus your `.java` files. Judge0 compiles them with `javac` and starts the class that contains `main`, or `Grader` when a task is being marked.

The public [Piston](https://github.com/engineer-man/piston) API was the other obvious choice. It has been whitelist-only since 15 February 2026, so this app does not call it.

Limits worth knowing:

- The shared instance is rate-limited and sometimes busy. A run that does not return is reported in the output panel; the rest of the app still works.
- Your source and standard input are sent to `ce.judge0.com`. Do not put secrets in the editor.
- Programs have a short CPU limit, no network, and no keyboard beyond the standard-input box.
- Classes must be in the default package. A `public class` must match its file name.
- At most six `.java` files go up in one run.

## Highlighting

Editors and read-only snippets use **CodeMirror 6** with the Lezer Java parser (`@codemirror/lang-java`) and the One Dark theme. The bundle is committed so GitHub Pages does not depend on a CDN for highlighting. Loading CodeMirror from a CDN would also risk mismatched package copies, which breaks the editor.

## Deploy on GitHub Pages

1. Push this folder to a public repository.
2. Settings → Pages → Build and deployment → Deploy from a branch.
3. Branch `main`, folder `/` (root).
4. The site is `https://<user>.github.io/<repo>/`.

No build step is required on GitHub. `vendor/codemirror.js` is already built. The tutor key stays in each visitor's browser. Runs depend on the public Judge0 instance being reachable from the visitor's network.
