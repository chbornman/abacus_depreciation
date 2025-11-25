import ReactMarkdown from "react-markdown";
import { Card, CardContent } from "@/components/ui/card";
import manualContent from "@/manual.md?raw";

export function Manual() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Manual</h1>
        <p className="text-[hsl(var(--muted-foreground))]">
          Learn how to use Abacus Depreciation
        </p>
      </div>

      <Card>
        <CardContent className="p-6 lg:p-8">
          <article className="prose prose-slate dark:prose-invert max-w-none prose-headings:scroll-mt-20 prose-h1:text-2xl prose-h1:font-bold prose-h2:text-xl prose-h2:font-semibold prose-h2:border-b prose-h2:border-[hsl(var(--border))] prose-h2:pb-2 prose-h3:text-lg prose-h3:font-medium prose-p:text-[hsl(var(--foreground))] prose-li:text-[hsl(var(--foreground))] prose-strong:text-[hsl(var(--foreground))] prose-code:bg-[hsl(var(--muted))] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none prose-pre:bg-[hsl(var(--muted))] prose-pre:border prose-pre:border-[hsl(var(--border))] prose-table:border-collapse prose-th:border prose-th:border-[hsl(var(--border))] prose-th:bg-[hsl(var(--muted))] prose-th:px-3 prose-th:py-2 prose-td:border prose-td:border-[hsl(var(--border))] prose-td:px-3 prose-td:py-2 prose-hr:border-[hsl(var(--border))]">
            <ReactMarkdown>{manualContent}</ReactMarkdown>
          </article>
        </CardContent>
      </Card>
    </div>
  );
}
