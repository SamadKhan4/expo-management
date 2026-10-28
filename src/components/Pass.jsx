import React, { useEffect, useState } from "react";
import * as s from "../services/data";
import { Button, Modal, StatusBadge } from "./common";
import toast from "react-hot-toast";
export default function Pass({ id, onClose, refresh, exhibitor = false }) {
  const { visitor: v, expo: e } = s.getQRPass(id);
  const [qr, setQr] = useState("");
  const [preview, setPreview] = useState("Email");
  useEffect(() => {
    s.generateQRCode(id)
      .then(setQr)
      .catch((e) => toast.error(e.message));
  }, [id, v.token]);
  const act = (fn) => {
    try {
      fn();
      refresh();
      toast.success("Demo action recorded");
    } catch (e) {
      toast.error(e.message);
    }
  };
  return (
    <Modal title={v.type === "Exhibitor" ? "Exhibitor entry pass" : "Visitor pass"} onClose={onClose}>
      <div className="ticket">
        <div className="eyebrow">EXPOFLOW · ADMISSION PASS</div>
        <h2>{e.name}</h2>
        <p>
          {e.venue} · {new Date(e.start).toLocaleDateString()}
        </p>
        {qr && (
          <img
            src={qr}
            alt={`${v.type || "Visitor"} entry QR code`}
            className="w-52 mx-auto my-4"
          />
        )}
        <h2>{v.name}</h2>
        <p className="font-mono">{v.registrationId}</p>
        <p>{v.type} ? {v.company}</p>
        <div className="mt-3">
          <StatusBadge>{v.status}</StatusBadge>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 my-4 print:hidden">
        <Button
          onClick={() =>
            s.downloadQRPass(id).catch((e) => toast.error(e.message))
          }
        >
          Download pass
        </Button>
        <Button variant="secondary" onClick={() => s.printQRPass(id)}>
          Print
        </Button>
        {!exhibitor && <Button
          variant="secondary"
          onClick={() => act(() => s.regenerateQRToken(id))}
        >
          Replace QR token
        </Button>}
      </div>
      {!exhibitor && <section className="bg-slate-50 p-4 rounded-xl print:hidden">
        <div className="flex justify-between mb-3">
          <h3>Delivery preview</h3>
          <StatusBadge>Demo Mode</StatusBadge>
        </div>
        <div className="flex gap-2 mb-3">
          {["Email", "WhatsApp"].map((c) => (
            <Button key={c} variant="secondary" onClick={() => setPreview(c)}>
              {c}
            </Button>
          ))}
        </div>
        <p className="text-sm text-slate-500">
          {preview === "Email"
            ? `To: ${v.email} · Your ${e.name} pass`
            : `To: ${v.phone} · Your admission pass reference: ${v.registrationId}`}
        </p>
        <p className="my-3 text-sm">
          Hello {v.name}, your registration for {e.name} is confirmed. Present
          the QR pass above at {e.venue}.
        </p>
        <Button
          disabled={!v.consent}
          onClick={() => act(() => s.retryDelivery(id, preview))}
        >
          Simulate {preview} delivery / retry
        </Button>
        {!v.consent && (
          <p className="text-xs mt-2">Messaging consent not provided.</p>
        )}
        <p className="text-xs mt-3 text-slate-500">
          No actual messages are sent.
        </p>
        {s
          .getDeliveryStatus(id)
          .slice(0, 4)
          .map((d) => (
            <div key={d.id} className="text-xs flex justify-between mt-3">
              <span>
                {d.channel} · {new Date(d.time).toLocaleString()}
              </span>
              <StatusBadge>{d.status}</StatusBadge>
            </div>
          ))}
      </section>}
    </Modal>
  );
}
