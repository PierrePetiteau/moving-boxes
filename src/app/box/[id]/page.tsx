import { getBoxByQRId } from "@src/lib/server-notion";
import { notFound } from "next/navigation";
import BoxDetailsWrapper from "./BoxDetailsWrapper";

interface BoxPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function BoxPage({ params }: BoxPageProps) {
  try {
    const { id } = await params;
    const box = await getBoxByQRId(id);

    if (!box) {
      notFound();
    }

    return <BoxDetailsWrapper initialBox={box} />;
  } catch (error) {
    throw error;
  }
}
