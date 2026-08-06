import {
  CircleCheckBigIcon,
  Clock3Icon,
  LoaderCircleIcon,
  TicketIcon,
  TriangleAlertIcon,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type SectionCardsProps = {
  total: number;
  pending: number;
  ongoing: number;
  done: number;
  highPriority: number;
  highPriorityOpen: number;
  projectCount: number;
};

type MetricCard = {
  label: string;
  value: number;
  helper: string;
  badge: string;
  icon: LucideIcon;
  iconClassName: string;
};

function percentage(value: number, total: number) {
  if (total === 0) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

export function SectionCards({
  total,
  pending,
  ongoing,
  done,
  highPriority,
  highPriorityOpen,
  projectCount,
}: SectionCardsProps) {
  const cards: MetricCard[] = [
    {
      label: "Total tickets",
      value: total,
      helper: `Across ${projectCount} accessible ${projectCount === 1 ? "project" : "projects"}`,
      badge: `${projectCount} ${projectCount === 1 ? "project" : "projects"}`,
      icon: TicketIcon,
      iconClassName: "text-primary",
    },
    {
      label: "Pending",
      value: pending,
      helper: "Waiting to be started",
      badge: percentage(pending, total),
      icon: Clock3Icon,
      iconClassName: "text-amber-600 dark:text-amber-400",
    },
    {
      label: "Ongoing",
      value: ongoing,
      helper: "Work currently in progress",
      badge: percentage(ongoing, total),
      icon: LoaderCircleIcon,
      iconClassName: "text-sky-600 dark:text-sky-400",
    },
    {
      label: "Done",
      value: done,
      helper: "Tickets marked as resolved",
      badge: percentage(done, total),
      icon: CircleCheckBigIcon,
      iconClassName: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "High priority",
      value: highPriority,
      helper: `${highPriorityOpen} ${highPriorityOpen === 1 ? "ticket is" : "tickets are"} still open`,
      badge: percentage(highPriority, total),
      icon: TriangleAlertIcon,
      iconClassName: "text-rose-600 dark:text-rose-400",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card
            className="@container/card bg-gradient-to-t from-primary/5 to-card shadow-xs dark:bg-card"
            key={card.label}
          >
            <CardHeader className="relative">
              <CardDescription>{card.label}</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {card.value.toLocaleString()}
              </CardTitle>
              <div className="absolute right-4 top-4">
                <Badge className="gap-1 rounded-lg" variant="outline">
                  <Icon className={card.iconClassName} />
                  {card.badge}
                </Badge>
              </div>
            </CardHeader>
            <CardFooter className="text-xs text-muted-foreground">
              {card.helper}
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
