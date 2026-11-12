import { Linking, Text as RNText, View } from 'react-native';
import { Text } from '@/components/ui';
import { cn } from '@/lib/cn';

/**
 * Markdown liviano para las respuestas del asistente (contrato §4: `response` viene en markdown).
 * Cubre lo que usa un chat: títulos, párrafos, negrita, cursiva, código, enlaces, listas,
 * citas, separadores y tablas simples. Sin dependencias: ver D-23 en docs/decisiones.md.
 * Tolera markdown a medio escribir (la respuesta "crece" mientras el turno está en `running`).
 */

type Block =
  | { type: 'h'; level: number; text: string }
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: { n: string; text: string }[] }
  | { type: 'quote'; text: string }
  | { type: 'code'; text: string }
  | { type: 'hr' }
  | { type: 'table'; rows: string[][] };

export function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) blocks.push({ type: 'p', text: para.join('\n') });
    para = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*```/.test(line)) {
      flush();
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) code.push(lines[i++]);
      blocks.push({ type: 'code', text: code.join('\n') });
      continue;
    }
    if (!line.trim()) {
      flush();
      continue;
    }
    let m: RegExpMatchArray | null;
    if ((m = line.match(/^(#{1,6})\s+(.*)$/))) {
      flush();
      blocks.push({ type: 'h', level: m[1].length, text: m[2] });
    } else if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
      flush();
      blocks.push({ type: 'hr' });
    } else if ((m = line.match(/^\s*[-*+]\s+(.*)$/))) {
      flush();
      const last = blocks[blocks.length - 1];
      if (last?.type === 'ul') last.items.push(m[1]);
      else blocks.push({ type: 'ul', items: [m[1]] });
    } else if ((m = line.match(/^\s*(\d+)[.)]\s+(.*)$/))) {
      flush();
      const last = blocks[blocks.length - 1];
      if (last?.type === 'ol') last.items.push({ n: m[1], text: m[2] });
      else blocks.push({ type: 'ol', items: [{ n: m[1], text: m[2] }] });
    } else if ((m = line.match(/^>\s?(.*)$/))) {
      flush();
      const last = blocks[blocks.length - 1];
      if (last?.type === 'quote') last.text += `\n${m[1]}`;
      else blocks.push({ type: 'quote', text: m[1] });
    } else if (/^\s*\|.*\|\s*$/.test(line)) {
      flush();
      if (/^\s*\|?[\s:|-]+\|?\s*$/.test(line) && line.includes('-')) continue; // fila separadora |---|
      const cells = line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const last = blocks[blocks.length - 1];
      if (last?.type === 'table') last.rows.push(cells);
      else blocks.push({ type: 'table', rows: [cells] });
    } else {
      para.push(line);
    }
  }
  flush();
  return blocks;
}

interface Span {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  href?: string;
}

const INLINE = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\[[^\]]+\]\([^)\s]+\)|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/;

export function parseInline(src: string, base: Omit<Span, 'text'> = {}): Span[] {
  const out: Span[] = [];
  let rest = src;
  while (rest) {
    const m = rest.match(INLINE);
    if (!m || m.index === undefined) {
      out.push({ ...base, text: rest });
      break;
    }
    if (m.index > 0) out.push({ ...base, text: rest.slice(0, m.index) });
    const tok = m[0];
    if (tok.startsWith('**') || tok.startsWith('__')) out.push(...parseInline(tok.slice(2, -2), { ...base, bold: true }));
    else if (tok.startsWith('`')) out.push({ ...base, code: true, text: tok.slice(1, -1) });
    else if (tok.startsWith('[')) {
      const lm = tok.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/)!;
      out.push(...parseInline(lm[1], { ...base, href: lm[2] }));
    } else out.push(...parseInline(tok.slice(1, -1), { ...base, italic: true }));
    rest = rest.slice(m.index + tok.length);
  }
  return out;
}

function openLink(href: string) {
  if (/^(https?:|mailto:|tel:)/i.test(href)) void Linking.openURL(href);
}

function Inline({ text, className }: { text: string; className?: string }) {
  return (
    <Text className={cn('leading-6', className)}>
      {parseInline(text).map((s, i) => (
        <RNText
          key={i}
          onPress={s.href ? () => openLink(s.href!) : undefined}
          accessibilityRole={s.href ? 'link' : undefined}
          className={cn(
            s.bold && 'font-bold',
            s.italic && 'italic',
            s.code && 'rounded bg-muted font-mono text-sm',
            s.href && 'text-primary underline',
          )}
        >
          {s.text}
        </RNText>
      ))}
    </Text>
  );
}

export function Markdown({ source }: { source: string }) {
  const blocks = parseBlocks(source);
  return (
    <View className="gap-2">
      {blocks.map((b, i) => {
        switch (b.type) {
          case 'h':
            return (
              <Inline
                key={i}
                text={b.text}
                className={cn('font-bold', b.level <= 2 ? 'text-lg' : 'text-base')}
              />
            );
          case 'p':
            return <Inline key={i} text={b.text} />;
          case 'ul':
            return (
              <View key={i} className="gap-1">
                {b.items.map((it, j) => (
                  <View key={j} className="flex-row gap-2 pr-2">
                    <Text className="leading-6">•</Text>
                    <View className="flex-1">
                      <Inline text={it} />
                    </View>
                  </View>
                ))}
              </View>
            );
          case 'ol':
            return (
              <View key={i} className="gap-1">
                {b.items.map((it, j) => (
                  <View key={j} className="flex-row gap-2 pr-2">
                    <Text className="min-w-5 font-semibold leading-6">{it.n}.</Text>
                    <View className="flex-1">
                      <Inline text={it.text} />
                    </View>
                  </View>
                ))}
              </View>
            );
          case 'quote':
            return (
              <View key={i} className="border-l-4 border-primary/40 pl-3">
                <Inline text={b.text} className="text-muted-foreground" />
              </View>
            );
          case 'code':
            return (
              <View key={i} className="rounded-lg bg-muted p-3">
                <Text className="font-mono text-sm">{b.text}</Text>
              </View>
            );
          case 'hr':
            return <View key={i} className="my-1 h-px bg-border" />;
          case 'table':
            return (
              <View key={i} className="overflow-hidden rounded-lg border border-border">
                {b.rows.map((row, j) => (
                  <View key={j} className={cn('flex-row', j > 0 && 'border-t border-border', j === 0 && 'bg-muted')}>
                    {row.map((cell, k) => (
                      <View key={k} className="flex-1 px-2 py-1.5">
                        <Inline text={cell} className={cn('text-sm', j === 0 && 'font-semibold')} />
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            );
        }
      })}
    </View>
  );
}
