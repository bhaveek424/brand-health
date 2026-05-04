import DashboardLayout from "@/components/DashboardLayout";
import { demoData } from "@/lib/demo-data";
import { Card, CardHeader, CardBody, Badge } from "@/components/SharedUI";

export default function WeeklyBriefPage() {
  const { weeklyBrief } = demoData;

  const fnColors: Record<string, "neutral" | "info" | "warning" | "danger"> = {
    category: "info",
    support: "info",
    marketplace: "warning",
    supplier: "danger",
    warranty: "neutral",
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 max-w-6xl">
        <Card>
          <CardHeader title="Executive Summary" subtitle={`Period: ${weeklyBrief.period.start} to ${weeklyBrief.period.end}`} />
          <CardBody>
            <p className="text-sm text-slate-700 leading-relaxed">{weeklyBrief.executive_summary}</p>
          </CardBody>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader title="Top Risks" />
            <CardBody className="space-y-3">
              {weeklyBrief.top_risks.map((risk, i) => (
                <div key={i} className="border-l-2 border-red-400 pl-3">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold text-slate-800">{risk.title}</span>
                    <Badge variant={risk.severity === "critical" ? "danger" : "warning"}>{risk.severity}</Badge>
                  </div>
                  <div className="text-xs text-slate-500">{risk.evidence_summary}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {risk.affected_marketplaces.map((m) => m.replace("_", " ")).join(", ")} ·{" "}
                    {risk.estimated_exposure_orders.toLocaleString()} orders exposed
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Recommended Actions" />
            <CardBody className="space-y-3">
              {weeklyBrief.recommended_actions.map((action, i) => (
                <div key={i} className="border-l-2 border-sky-400 pl-3">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Badge variant={fnColors[action.function] ?? "neutral"}>{action.function}</Badge>
                    <span className="text-xs font-semibold text-slate-800">{action.title}</span>
                    <Badge variant={action.priority === "urgent" ? "danger" : action.priority === "high" ? "warning" : "neutral"}>
                      {action.priority}
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-500">{action.description}</div>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader title="Supplier Escalation Draft" />
          <CardBody>
            <pre className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded p-3 whitespace-pre-wrap font-mono leading-relaxed">
              {weeklyBrief.supplier_escalation_draft}
            </pre>
          </CardBody>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader title="Marketplace Listing Recommendation" />
            <CardBody>
              <p className="text-xs text-slate-700 leading-relaxed">{weeklyBrief.marketplace_listing_recommendation}</p>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Support & Warranty Recommendation" />
            <CardBody>
              <p className="text-xs text-slate-700 leading-relaxed">{weeklyBrief.support_warranty_recommendation}</p>
            </CardBody>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
