/** 段落内のハードラップを解除し、UIコンテナ幅で自然に折り返せるようにする */
export function reflowParagraphs(text: string): string {
  return text
    .split(/\n{2,}/)
    .map(para => para.replace(/\n[ \t]*(?![-\(]|\d+\. )/g, ' '))
    .join('\n\n')
}
