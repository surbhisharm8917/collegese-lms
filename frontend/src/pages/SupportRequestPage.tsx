import { useState } from "react";
import { CheckCircle2, Clock3, Mail, Search } from "lucide-react";
import { toast } from "sonner";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { BRAND } from "@/lib/brand";
import api from "@/lib/api";

type TicketStatus = {
  reference: string;
  category: string;
  subject: string;
  status: string;
  resolution?: string | null;
  createdAt: string;
  updatedAt: string;
};

const categories = [
  ["ACCOUNT", "Account or access"],
  ["COURSE", "Course or class"],
  ["PAYMENT", "Payment or refund"],
  ["PRIVACY", "Privacy request"],
  ["TECHNICAL", "Technical problem"],
  ["OTHER", "Other"],
] as const;

const SupportRequestPage = () => {
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState("");
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [ticket, setTicket] = useState<TicketStatus | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    category: "",
    subject: "",
    message: "",
    consentToContact: false,
    website: "",
  });

  const submitTicket = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const response = await api.post("/support/tickets", form);
      const createdReference = response.data.ticket.reference as string;
      setReference(createdReference);
      setLookupEmail(form.email);
      toast.success(`Request recorded as ${createdReference}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Unable to record your request.");
    } finally {
      setSubmitting(false);
    }
  };

  const lookupTicket = async (event: React.FormEvent) => {
    event.preventDefault();
    setLookupLoading(true);
    setTicket(null);
    try {
      const response = await api.get(`/support/tickets/${encodeURIComponent(reference)}/status`, {
        params: { email: lookupEmail },
      });
      setTicket(response.data.ticket);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Request not found.");
    } finally {
      setLookupLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar />
      <main className="flex-1">
        <section className="border-b border-slate-100 bg-[#072A60] text-white">
          <div className="mx-auto max-w-6xl px-6 py-14">
            <p className="text-sm font-semibold uppercase text-orange-300">Support and redressal</p>
            <h1 className="mt-3 text-4xl font-bold sm:text-5xl">Grievance and Support</h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-blue-100">
              Submit account, course, payment, privacy, or technical concerns and keep the reference
              number for tracking. We aim to acknowledge requests within 48 hours and resolve
              consumer grievances within one month.
            </p>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-10 px-6 py-12 lg:grid-cols-[1fr_1.6fr]">
          <div className="space-y-7">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Contact details</h2>
              <div className="mt-5 space-y-4 text-sm text-slate-600">
                <p className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-4 w-4 text-orange-600" />
                  <span>
                    <strong className="block text-slate-900">Email</strong>
                    <a href={`mailto:${BRAND.grievanceEmail}`}>{BRAND.grievanceEmail}</a>
                  </span>
                </p>
                <p className="flex items-start gap-3">
                  <Clock3 className="mt-0.5 h-4 w-4 text-orange-600" />
                  <span>
                    <strong className="block text-slate-900">Review timeline</strong>
                    Acknowledgment within 48 hours; resolution targeted within one month.
                  </span>
                </p>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-7 text-sm leading-6 text-slate-600">
              <strong className="text-slate-900">{BRAND.legalName}</strong>
              {BRAND.grievanceOfficerName && (
                <p className="mt-2">Grievance Officer: {BRAND.grievanceOfficerName}</p>
              )}
              {BRAND.legalAddress && <p className="mt-2">{BRAND.legalAddress}</p>}
              <p className="mt-2">Phone: {BRAND.phone}</p>
              {BRAND.cin && <p>CIN: {BRAND.cin}</p>}
              {BRAND.gstin && <p>GSTIN: {BRAND.gstin}</p>}
            </div>
          </div>

          <Tabs defaultValue="new" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="new">New request</TabsTrigger>
              <TabsTrigger value="track">Track request</TabsTrigger>
            </TabsList>

            <TabsContent value="new" className="mt-6">
              {reference ? (
                <div className="border border-emerald-200 bg-emerald-50 p-6">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                  <h2 className="mt-4 text-xl font-semibold text-emerald-950">Request received</h2>
                  <p className="mt-2 text-sm leading-6 text-emerald-800">
                    Your reference is <strong>{reference}</strong>. A confirmation has been sent to
                    the email provided. Keep this reference to track updates.
                  </p>
                  <Button className="mt-5" variant="outline" onClick={() => setReference("")}>
                    Submit another request
                  </Button>
                </div>
              ) : (
                <form onSubmit={submitTicket} className="grid gap-5 border border-slate-200 p-6">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="support-name">Full name</Label>
                      <Input
                        id="support-name"
                        required
                        value={form.name}
                        onChange={(event) => setForm({ ...form, name: event.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="support-email">Registered email</Label>
                      <Input
                        id="support-email"
                        type="email"
                        required
                        value={form.email}
                        onChange={(event) => setForm({ ...form, email: event.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="support-phone">Phone (optional)</Label>
                      <Input
                        id="support-phone"
                        type="tel"
                        value={form.phone}
                        onChange={(event) => setForm({ ...form, phone: event.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select
                        required
                        value={form.category}
                        onValueChange={(category) => setForm({ ...form, category })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="support-subject">Subject</Label>
                    <Input
                      id="support-subject"
                      minLength={5}
                      maxLength={160}
                      required
                      value={form.subject}
                      onChange={(event) => setForm({ ...form, subject: event.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="support-message">Details</Label>
                    <Textarea
                      id="support-message"
                      minLength={20}
                      maxLength={5000}
                      rows={7}
                      required
                      value={form.message}
                      onChange={(event) => setForm({ ...form, message: event.target.value })}
                    />
                  </div>
                  <label className="flex items-start gap-2.5 text-xs leading-5 text-slate-600">
                    <input
                      type="checkbox"
                      required
                      checked={form.consentToContact}
                      onChange={(event) =>
                        setForm({ ...form, consentToContact: event.target.checked })
                      }
                      className="mt-0.5 h-4 w-4 accent-orange-500"
                    />
                    I consent to being contacted about this request using the details provided.
                  </label>
                  <input
                    className="hidden"
                    tabIndex={-1}
                    autoComplete="off"
                    value={form.website}
                    onChange={(event) => setForm({ ...form, website: event.target.value })}
                    aria-hidden="true"
                  />
                  <Button type="submit" disabled={submitting || !form.category}>
                    {submitting ? "Submitting..." : "Submit request"}
                  </Button>
                </form>
              )}
            </TabsContent>

            <TabsContent value="track" className="mt-6">
              <form onSubmit={lookupTicket} className="space-y-5 border border-slate-200 p-6">
                <div className="space-y-2">
                  <Label htmlFor="ticket-reference">Reference number</Label>
                  <Input
                    id="ticket-reference"
                    required
                    value={reference}
                    onChange={(event) => setReference(event.target.value.toUpperCase())}
                    placeholder="JECA-YYYYMMDD-XXXXXXXX"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ticket-email">Email used for the request</Label>
                  <Input
                    id="ticket-email"
                    type="email"
                    required
                    value={lookupEmail}
                    onChange={(event) => setLookupEmail(event.target.value)}
                  />
                </div>
                <Button type="submit" variant="outline" disabled={lookupLoading}>
                  <Search className="h-4 w-4" />
                  {lookupLoading ? "Checking..." : "Check status"}
                </Button>
                {ticket && (
                  <div className="border-t border-slate-100 pt-5 text-sm text-slate-600">
                    <div className="flex items-center justify-between gap-4">
                      <strong className="text-slate-950">{ticket.reference}</strong>
                      <span className="bg-orange-50 px-2 py-1 text-xs font-semibold text-orange-700">
                        {ticket.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="mt-3 font-medium text-slate-900">{ticket.subject}</p>
                    {ticket.resolution && <p className="mt-3 leading-6">{ticket.resolution}</p>}
                    <p className="mt-3 text-xs text-slate-400">
                      Last updated {new Date(ticket.updatedAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </form>
            </TabsContent>
          </Tabs>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default SupportRequestPage;
