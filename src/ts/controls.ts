// A .number-control contains a number input and .number-step buttons with data-step="up" or "down".
export function initNumberControls(root: Document | HTMLElement = document): void
{
    let repeatTimer: number | undefined;
    const stopRepeat = () =>
    {
        window.clearTimeout(repeatTimer);
        repeatTimer = undefined;
    };

    for (const group of root.querySelectorAll<HTMLElement>(".number-control"))
    {
        const input        = group.querySelector<HTMLInputElement>("input[type=\"number\"]")!;
        let lastValidValue = input.value;
        input.addEventListener("input", () =>
        {
            if (input.validity.valid)
            {
                lastValidValue = input.value;
            }
        });

        for (const button of group.querySelectorAll<HTMLButtonElement>(".number-step"))
        {
            const step = (): boolean =>
            {
                if (button.matches(":disabled") || input.matches(":disabled") || input.readOnly)
                {
                    return false;
                }

                if (!input.validity.valid)
                {
                    input.value = lastValidValue;
                }

                const previous = input.value;
                if (button.dataset.step === "up")
                {
                    input.stepUp();
                }
                else
                {
                    input.stepDown();
                }

                if (input.value === previous)
                {
                    return false;
                }

                lastValidValue = input.value;
                input.dispatchEvent(new Event("input", { bubbles: true }));
                return true;
            };

            button.addEventListener("pointerdown", event =>
            {
                if (event.button !== 0 || !event.isPrimary || button.matches(":disabled"))
                {
                    return;
                }

                stopRepeat();
                button.setPointerCapture(event.pointerId);
                if (!step())
                {
                    return;
                }

                const repeat = () =>
                {
                    repeatTimer = undefined;
                    if (button.isConnected && step())
                    {
                        repeatTimer = window.setTimeout(repeat, 75);
                    }
                };
                repeatTimer  = window.setTimeout(repeat, 400);
            });

            button.addEventListener("click", event =>
            {
                // Pointer presses step on pointerdown; keyboard activation still uses click.
                if (event.detail === 0)
                {
                    stopRepeat();
                    step();
                }
            });
        }
    }

    root.addEventListener("pointerup", stopRepeat);
    root.addEventListener("pointercancel", stopRepeat);
    root.addEventListener("lostpointercapture", stopRepeat);
    window.addEventListener("blur", stopRepeat);
    document.addEventListener("visibilitychange", () =>
    {
        if (document.hidden)
        {
            stopRepeat();
        }
    });
}
