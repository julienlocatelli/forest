import { Card, Heading, Text } from "@forest/ui";

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center p-(--space-xl)">
      <Card as="section" aria-labelledby="not-found-title">
        <Heading level={1} id="not-found-title">
          Page not found
        </Heading>
        <Text tone="muted">This page does not exist or has moved.</Text>
      </Card>
    </main>
  );
}
