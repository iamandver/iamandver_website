type TerminalState = {
    open: boolean;
    input: string;
    lines: { text: string; command: boolean }[];
};

// Page and game keyboard handlers should return while the terminal is open.
export function isTerminalOpen(): boolean
{
    return document.getElementById("terminal")?.hidden === false;
}

export function initTerminal(): void
{
    const storageKey   = "andver.terminal.v1";
    const controls     = document.querySelector<HTMLDivElement>(".controls") ?? document.createElement("div");
    controls.className = "controls";
    controls.innerHTML = `
        <div class="controls-inner">
            <a class="controls-command" href="${import.meta.env.BASE_URL}">[ Home ]</a>
            <button class="controls-command terminal-toggle" type="button" aria-controls="terminal" aria-expanded="false">[ Terminal ]</button>
            <span class="terminal-hint" hidden>ESC Close</span>
        </div>
        <section id="terminal" class="terminal" aria-labelledby="terminal-title" hidden>
            <h2 id="terminal-title" class="terminal-title">Terminal</h2>
            <button class="terminal-close" type="button" aria-label="Close terminal">[×]</button>
            <div class="terminal-transcript"></div>
            <form class="terminal-prompt">
                <label for="terminal-input">andver&gt;</label>
                <input id="terminal-input" type="text" aria-label="Terminal command" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="go">
            </form>
        </section>`;

    document.body.append(controls);

    const terminal    = controls.querySelector<HTMLElement>(".terminal")!;
    const toggle      = controls.querySelector<HTMLButtonElement>(".terminal-toggle")!;
    const closeButton = controls.querySelector<HTMLButtonElement>(".terminal-close")!;
    const hint        = controls.querySelector<HTMLElement>(".terminal-hint")!;
    const transcript  = controls.querySelector<HTMLDivElement>(".terminal-transcript")!;
    const form        = controls.querySelector<HTMLFormElement>(".terminal-prompt")!;
    const input       = controls.querySelector<HTMLInputElement>("#terminal-input")!;

    const write = (text: string, className = "") =>
    {
        const line       = document.createElement("div");
        line.className   = className;
        line.textContent = text;
        transcript.append(line);
        transcript.scrollTop = transcript.scrollHeight;
    };

    const setOpen = (open: boolean) =>
    {
        terminal.hidden = !open;
        hint.hidden     = !open;
        toggle.setAttribute("aria-expanded", String(open));
        transcript.scrollTop = transcript.scrollHeight;
        if (open)
        {
            input.focus({ preventScroll: true });
        }
    };

    const close = () =>
    {
        setOpen(false);
        toggle.focus({ preventScroll: true });
    };

    toggle.addEventListener("click", () =>
    {
        if (!terminal.hidden)
        {
            close();
            return;
        }

        setOpen(true);
    });

    closeButton.addEventListener("click", close);
    document.addEventListener("keydown", event =>
    {
        if (event.key === "Escape" && !terminal.hidden)
        {
            event.preventDefault();
            close();
        }
    });

    form.addEventListener("submit", event =>
    {
        event.preventDefault();
        const command = input.value.trim();
        input.value   = "";
        if (!command)
        {
            return;
        }

        write(`andver> ${command}`, "terminal-command");
        switch (command.toLowerCase())
        {
            /*
             * possible commands:
             * hi, bye, <3, impulse 9, iddqd, idkfa, god, noclip,
             */
            case "help":
                write(
                    "home     return home\n" +
                    "braille  open the image converter\n" +
                    "clear    clear the terminal\n" +
                    "close    close this window");
                break;
            case "home":
                window.location.assign(import.meta.env.BASE_URL);
                break;
            case "braille":
                window.location.assign(`${import.meta.env.BASE_URL}braille.html`);
                break;
            case "2048":
                window.location.assign(`${import.meta.env.BASE_URL}2048.html`);
                break;

            case "clear":
                transcript.replaceChildren();
                break;
            case "close":
                close();
                break;
            default:
                write(`Unknown command: ${command}\nType HELP for commands.`);
                break;
        }
    });

    window.addEventListener("pagehide", () =>
    {
        const state: TerminalState = {
            open : !terminal.hidden,
            input: input.value,
            lines: Array.from(transcript.children).slice(-200).map(line => ({
                text   : line.textContent ?? "",
                command: line.classList.contains("terminal-command")
            }))
        };

        try
        {
            sessionStorage.setItem(storageKey, JSON.stringify(state));
        } catch
        {
            // The terminal still works when browser storage is unavailable or full.
        }
    });

    try
    {
        const saved = sessionStorage.getItem(storageKey);
        if (saved)
        {
            const state = JSON.parse(saved) as TerminalState;
            for (const line of state.lines)
            {
                write(line.text, line.command ? "terminal-command" : "");
            }
            input.value = state.input;
            setOpen(state.open);
            return;
        }
    } catch
    {
        // Start fresh if saved state cannot be restored.
        transcript.replaceChildren();
        input.value = "";
        setOpen(false);
    }

    write("Try typing stuff you find on the page.\nWho knows, it might do something.\n¯\\_(ツ)_/¯");
}
