export function chunkText(text: string, maxChars: number) {
  const paragraphs = text.split(/\n{2,}/);
  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    const block = paragraph.trim();
    if (!block) continue;

    if (block.length > maxChars) {
      if (current) {
        chunks.push(current.trim());
        current = "";
      }
      chunks.push(...splitLongParagraph(block, maxChars));
      continue;
    }

    const next = current ? `${current}\n\n${block}` : block;
    if (next.length > maxChars && current) {
      chunks.push(current.trim());
      current = block;
    } else {
      current = next;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

function splitLongParagraph(text: string, maxChars: number) {
  const sentences = text.match(/[^。！？.!?]+[。！？.!?]?/g) ?? [text];
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    const next = current + sentence;
    if (next.length > maxChars && current) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current = next;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks;
}
