import { useCallback, useEffect, useState } from "react";
import { Inbox, LoaderCircle, Search } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import api from "@/lib/api";

type SupportTicket = {
  id: string;
  reference: string;
  name: string;
  email: string;
  phone?: string | null;
  category: string;
  subject: string;
  message: string;
  status: string;
  resolution?: string | null;
  createdAt: string;
};

const statuses = ["OPEN", "IN_PROGRESS", "WAITING_FOR_USER", "RESOLVED", "CLOSED"];

const AdminSupportPage = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [nextStatus, setNextStatus] = useState("IN_PROGRESS");
  const [resolution, setResolution] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/support/admin/tickets", {
        params: { status, search, limit: 100 },
      });
      setTickets(response.data.tickets);
    } catch {
      toast.error("Unable to load support requests.");
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void fetchTickets(), 250);
    return () => window.clearTimeout(timeout);
  }, [fetchTickets]);

  const openTicket = (ticket: SupportTicket) => {
    setSelected(ticket);
    setNextStatus(ticket.status);
    setResolution(ticket.resolution || "");
  };

  const saveTicket = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const response = await api.patch(`/support/admin/tickets/${selected.id}`, {
        status: nextStatus,
        resolution,
      });
      const updated = response.data.ticket as SupportTicket;
      setTickets((current) =>
        current.map((ticket) => (ticket.id === updated.id ? updated : ticket)),
      );
      setSelected(updated);
      toast.success("Support request updated.");
    } catch {
      toast.error("Unable to update support request.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase text-orange-600">Operations</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-950">Support requests</h1>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Reference, email, or subject"
              className="pl-9"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              {statuses.map((value) => (
                <SelectItem key={value} value={value}>
                  {value.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      {loading ? (
        <div className="flex min-h-64 items-center justify-center text-slate-500">
          <LoaderCircle className="mr-2 h-5 w-5 animate-spin" /> Loading requests
        </div>
      ) : tickets.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center border border-dashed border-slate-200 text-slate-500">
          <Inbox className="mb-3 h-7 w-7" />
          <p className="text-sm">No matching requests.</p>
        </div>
      ) : (
        <div className="overflow-hidden border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Requester</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    onClick={() => openTicket(ticket)}
                    className="cursor-pointer text-slate-600 hover:bg-orange-50/40"
                  >
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-900">
                      {ticket.reference}
                    </td>
                    <td className="px-4 py-3">
                      <span className="block font-medium text-slate-900">{ticket.name}</span>
                      <span className="text-xs">{ticket.email}</span>
                    </td>
                    <td className="px-4 py-3">{ticket.category}</td>
                    <td className="max-w-xs truncate px-4 py-3">{ticket.subject}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{ticket.status.replace(/_/g, " ")}</Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs">
                      {new Date(ticket.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selected && (
        <section className="border-t-4 border-[#072A60] bg-white pt-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row">
            <div>
              <p className="font-mono text-xs font-semibold text-orange-700">
                {selected.reference}
              </p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950">{selected.subject}</h2>
              <p className="mt-2 text-sm text-slate-500">
                {selected.name} | {selected.email} {selected.phone ? `| ${selected.phone}` : ""}
              </p>
            </div>
            <Button variant="ghost" onClick={() => setSelected(null)}>
              Close panel
            </Button>
          </div>
          <p className="mt-6 whitespace-pre-wrap border-l-2 border-orange-300 pl-4 text-sm leading-7 text-slate-700">
            {selected.message}
          </p>
          <div className="mt-6 grid gap-5 sm:grid-cols-[220px_1fr]">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={nextStatus} onValueChange={setNextStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="support-resolution">Response or resolution note</Label>
              <Textarea
                id="support-resolution"
                rows={4}
                maxLength={5000}
                value={resolution}
                onChange={(event) => setResolution(event.target.value)}
              />
            </div>
          </div>
          <Button className="mt-5" onClick={saveTicket} disabled={saving}>
            {saving ? "Saving..." : "Save and notify requester"}
          </Button>
        </section>
      )}
    </div>
  );
};

export default AdminSupportPage;
