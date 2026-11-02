import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-(--color-surface) font-sans">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-(--space-xxxl) px-(--space-xxxl) bg-(--color-background) rounded-(--radius-lg) shadow-(--shadow-md) sm:items-start">
        <Image
          className="dark:invert h-5 w-[100px]"
          src="/next.svg"
          alt="Next.js logo"
          width={100}
          height={20}
          priority
        />
        <div className="flex flex-col items-center gap-(--space-xl) text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-(length:--font-size-headline) font-(--font-weight-headline) leading-(--line-height-headline) tracking-tight text-(--color-text)">
            To get started, edit the{" "}
            <code className="rounded-(--radius-sm) bg-(--color-surface) px-(--space-xs) py-(--space-xxs) font-mono text-[0.9em]">
              page.tsx
            </code>{" "}
            file.
          </h1>
          <p className="max-w-md text-(length:--font-size-body) leading-(--line-height-body) text-(--color-text-muted)">
            Looking for a starting point or more instructions? Head over to{" "}
            <a
              href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              className="font-medium text-(--color-primary)"
            >
              Templates
            </a>{" "}
            or the{" "}
            <a
              href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              className="font-medium text-(--color-primary)"
            >
              Learning
            </a>{" "}
            center.
          </p>
        </div>
        <div className="flex flex-col gap-(--space-lg) text-(length:--font-size-label) font-(--font-weight-label) sm:flex-row">
          <a
            className="flex h-12 w-full items-center justify-center gap-2 rounded-(--radius-full) bg-(--color-primary) px-(--space-xl) text-(--color-on-primary) transition-opacity hover:opacity-90 md:w-[158px]"
            href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              className="dark:invert h-[14px] w-4"
              src="/vercel.svg"
              alt="Vercel logomark"
              width={16}
              height={14}
            />
            Deploy Now
          </a>
          <a
            className="flex h-12 w-full items-center justify-center rounded-(--radius-full) border border-solid border-(--color-border) px-(--space-xl) transition-colors hover:bg-(--color-surface) md:w-[158px]"
            href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            Documentation
          </a>
        </div>
      </main>
    </div>
  );
}
