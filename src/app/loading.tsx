import { Container } from "@/components/layout/container";
import { VideoGrid } from "@/components/video/video-grid";
import { VideoCardSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <Container className="desktop:py-6 py-4">
      <VideoGrid>
        {Array.from({ length: 12 }).map((_, i) => (
          <VideoCardSkeleton key={i} />
        ))}
      </VideoGrid>
    </Container>
  );
}
