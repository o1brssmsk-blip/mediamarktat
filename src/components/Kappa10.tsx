"use client";

export default function Kappa10() {
  return (
    <div className="min-h-screen bg-[#0f1720] text-white">
      <div className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-[#1b2530] px-4 py-3">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3">
          <div className="hidden items-center gap-2 sm:flex">
            <svg className="h-7 w-7 text-white/80" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
              <path d="m226 50c1 22 15 40 35 47 8 28 32 47 61 48 10 11 22 18 36 19 6 26 28 45 55 45 2 0 4 0 5-1 10 8 22 13 35 13 3 0 5 0 8-1 2 12 3 24 3 36 0 114-94 208-208 208-115 0-208-94-208-208 0-104 77-191 178-206m18-18c-118 6-212 104-212 224 0 124 100 224 224 224 124 0 224-100 224-224 0-19-2-38-7-56-6 3-13 5-20 5-12 0-22-5-29-13-4 1-7 1-11 1-22 0-39-18-39-39 0-2 0-4 0-6-3 1-6 1-8 1-15 0-28-8-35-20-2 0-5 0-7 0-25 0-46-19-48-44-20-3-34-19-34-39 0-5 0-10 2-14z" />
            </svg>
            <p className="text-xs text-white/80">
              We only use functional cookies on this login page.
            </p>
          </div>
          <button
            type="button"
            className="rounded-md border border-white/20 px-3 py-1.5 text-sm font-medium text-white/90 hover:bg-white/10"
          >
            Close
          </button>
        </div>
      </div>

      <main className="flex min-h-screen flex-col pt-16 lg:flex-row">
        <section className="flex w-full flex-1 flex-col bg-[#f6f8fb] text-[#1f2a37]">
          <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 pb-10 pt-6 sm:px-8">
            <div className="mb-6 flex items-center justify-end gap-3 text-xs font-semibold text-[#4a5b72]">
              <button type="button" className="rounded-full border border-[#d2dce9] px-2.5 py-1">
                EN
              </button>
              <button type="button" className="rounded-full border border-[#8fb0df] bg-[#dcebff] px-2.5 py-1">
                DE
              </button>
            </div>

            <div className="mx-auto w-full max-w-md">
              <div className="mb-5 flex justify-center">
                <img
                  src="/assets/kappa10/george-logo-bright-blue.svg"
                  alt="George"
                  className="h-16 w-auto"
                />
              </div>

              <h1 className="mb-6 text-center text-3xl font-semibold text-[#1f2a37]">George Login</h1>

              <div className="mb-3 flex items-start gap-2 rounded border border-[#e6bac1] bg-[#fbe9ed] px-3 py-2 text-sm text-[#7d1f2f]">
                <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
                </svg>
                <span id="error" />
              </div>

              <div className="mb-3 flex items-start gap-2 rounded border border-[#e6bac1] bg-[#fbe9ed] px-3 py-2 text-sm text-[#7d1f2f]">
                <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
                </svg>
                <span id="warningMsgContainer" />
              </div>

              <p className="mb-3 text-sm text-[#35465d]">
                Enter your login code or your chosen username.
              </p>

              <form className="space-y-3">
                <div className="relative">
                  <svg
                    className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#5c6f89]"
                    viewBox="0 0 512 512"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="m256 277c47 0 85-38 85-85 0-47-38-85-85-85-47 0-85 38-85 85 0 47 38 85 85 85z m0 43c-71 0-128-57-128-128 0-71 57-128 128-128 71 0 128 57 128 128 0 71-57 128-128 128z m-153 140c-7 10-20 12-30 5-10-6-12-20-5-29 41-59 111-95 188-95 77 0 146 36 188 95 7 9 5 23-5 29-10 7-23 5-30-5-33-47-90-76-153-76-63 0-120 29-153 76z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Login code / username"
                    aria-label="Login code / username"
                    className="h-12 w-full rounded border border-[#cad5e3] bg-white pl-11 pr-3 text-[15px] text-[#1f2a37] placeholder:text-[#8292a8] focus:outline-none"
                  />
                </div>

                <button
                  type="button"
                  className="h-12 w-full rounded bg-[#0078ff] text-sm font-semibold text-white hover:bg-[#006ce6]"
                >
                  Start login
                </button>

                <a
                  href="#"
                  className="inline-block text-sm text-[#2d63b3] underline underline-offset-2"
                >
                  Need an activation code or forgot your EB PIN?
                </a>
              </form>
            </div>
          </div>
        </section>

        <section className="relative hidden w-full items-center justify-center overflow-hidden bg-[#3f184b] lg:flex lg:w-1/2">
          <img
            src="/assets/kappa10/george-logo-white.svg"
            alt="George Logo"
            className="h-24 w-auto"
          />
          <div className="absolute bottom-20 left-1/2 w-full max-w-md -translate-x-1/2 px-6 text-center text-5xl font-light leading-tight text-white">
            <div>Simple</div>
            <div>Smart</div>
            <div>Personal</div>
          </div>
        </section>
      </main>

      <footer className="flex w-full items-center justify-center bg-[#1d2632] px-4 py-3 lg:justify-between lg:px-8">
        <img
          src="/assets/kappa10/EB-SPK_Logo_screen_white.svg"
          alt="Erste Bank und Sparkassen Logo"
          className="h-6 w-auto"
        />
        <ul className="hidden items-center gap-4 text-sm text-white/85 lg:flex">
          <li>
            <a href="#" className="hover:text-white">
              Legal Notice
            </a>
          </li>
          <li>
            <a href="#" className="hover:text-white">
              Privacy
            </a>
          </li>
          <li>
            <a href="#" className="hover:text-white">
              Terms
            </a>
          </li>
          <li>
            <a href="#" className="hover:text-white">
              Service and Contact
            </a>
          </li>
          <li>
            <a href="#" className="hover:text-white">
              George'i abi
            </a>
          </li>
        </ul>
      </footer>
    </div>
  );
}
