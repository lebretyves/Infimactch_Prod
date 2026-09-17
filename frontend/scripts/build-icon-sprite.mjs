import { readdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

const SOURCE = 'src/assets/icons';
const OUTPUT = 'src/assets/sprite.svg';

function normalize(svg) {
  return svg
    .replace(/<defs>[\s\S]*?<\/defs>/g, '')
    .replace(/<circle[^>]*fill="#E9F6FE"[^>]*\/>/g, '')
    .replace(/stroke="(white|#fff(?:fff)?|url\(#[^)]*\))"/gi, 'stroke="currentColor"')
    .replace(/fill="(white|#fff(?:fff)?|#252525|url\(#[^)]*\))"/gi, 'fill="currentColor"')
    .replace(/\s(preserveAspectRatio|overflow|style|width|height)="[^"]*"/g, '');
}

function toSymbol(name, svg) {
  const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1] ?? '0 0 24 24';
  const body = normalize(svg)
    .replace(/^[\s\S]*?<svg[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '')
    .trim();

  // fill="none" vient du <svg> racine de Figma : sans lui sur le symbole,
  // les tracés retombent sur le noir par défaut.
  return `<symbol id="i-${name}" viewBox="${viewBox}" fill="none">${body}</symbol>`;
}

const files = (await readdir(SOURCE)).filter((f) => f.endsWith('.svg')).sort();

const symbols = await Promise.all(
  files.map(async (file) => {
    const svg = await readFile(join(SOURCE, file), 'utf8');
    return toSymbol(basename(file, '.svg'), svg);
  }),
);

await writeFile(
  OUTPUT,
  `<svg xmlns="http://www.w3.org/2000/svg">${symbols.join('')}</svg>\n`,
);

console.log(`${files.length} icônes → ${OUTPUT}`);
console.log(files.map((f) => `  ${basename(f, '.svg')}`).join('\n'));
