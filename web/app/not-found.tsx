import { Container } from "@/components/container";
import { EmptyState } from "@/components/empty-state";

export default function NotFound() {
  return (
    <Container className="py-20">
      <EmptyState message="This page wandered off the path — nothing to see here." />
    </Container>
  );
}
