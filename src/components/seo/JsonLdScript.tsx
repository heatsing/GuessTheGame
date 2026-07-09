import { serializeJsonLd, type JsonLd } from "@/lib/structured-data";

interface JsonLdScriptProps {
  data: JsonLd | JsonLd[];
  /** Optional id for the script tag, useful for debugging. */
  id?: string;
}

/**
 * Renders a `<script type="application/ld+json">` tag containing the given
 * structured data. Server-rendered (no client JS), so the JSON-LD is present
 * in the initial HTML for crawlers.
 */
export function JsonLdScript({ data, id }: JsonLdScriptProps) {
  return (
    <script
      type="application/ld+json"
      id={id}
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
