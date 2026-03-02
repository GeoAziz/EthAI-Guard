import type { ApiParameter } from '@/types/api-reference';
import { Badge } from '@/components/ui/badge';

interface ParametersTableProps {
  parameters: ApiParameter[];
}

export function ParametersTable({ parameters }: ParametersTableProps) {
  if (!parameters || parameters.length === 0) {
    return <p className="text-sm text-muted-foreground italic">No parameters required</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-muted-foreground/20">
            <th className="text-left py-2 px-3 font-semibold text-foreground">Name</th>
            <th className="text-left py-2 px-3 font-semibold text-foreground">Type</th>
            <th className="text-left py-2 px-3 font-semibold text-foreground">Required</th>
            <th className="text-left py-2 px-3 font-semibold text-foreground">Description</th>
          </tr>
        </thead>
        <tbody>
          {parameters.map((param, idx) => (
            <tr key={idx} className="border-b border-muted-foreground/10 hover:bg-muted/30">
              <td className="py-3 px-3 font-mono text-xs text-primary">{param.name}</td>
              <td className="py-3 px-3 font-mono text-xs text-muted-foreground">{param.type}</td>
              <td className="py-3 px-3">
                {param.required ? (
                  <Badge variant="default" className="text-xs">
                    Required
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">
                    Optional
                  </Badge>
                )}
              </td>
              <td className="py-3 px-3 text-muted-foreground">{param.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
