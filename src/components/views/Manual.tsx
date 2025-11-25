import ReactMarkdown from "react-markdown";
import { Card, CardContent } from "@/components/ui/card";
import manualContent from "@/manual.md?raw";

export function Manual() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Manual</h1>
        <p className="text-muted-foreground">
          Learn how to use Abacus Depreciation
        </p>
      </div>

      <Card>
        <CardContent className="p-6 lg:p-8">
          <article className="prose prose-slate dark:prose-invert max-w-none prose-headings:scroll-mt-20 prose-headings:text-foreground prose-h1:text-2xl prose-h1:font-bold prose-h2:text-xl prose-h2:font-semibold prose-h2:border-b prose-h2:border-border prose-h2:pb-2 prose-h3:text-lg prose-h3:font-medium prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-table:border-collapse prose-th:border prose-th:border-border prose-th:bg-muted prose-th:px-3 prose-th:py-2 prose-td:border prose-td:border-border prose-td:px-3 prose-td:py-2 prose-hr:border-border">
            <ReactMarkdown>{manualContent}</ReactMarkdown>
          </article>
        </CardContent>
      </Card>
    </div>
  );
}
