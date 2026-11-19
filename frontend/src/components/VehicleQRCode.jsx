import { QRCodeSVG } from "qrcode.react";
import { vehiclePageUrl } from "../config";

/** QR code that opens the vehicle's public history page (scan it with a phone). */
export function VehicleQRCode({ vin }) {
  const url = vehiclePageUrl(vin);
  return (
    <figure className="qr">
      <QRCodeSVG value={url} size={148} includeMargin />
      <figcaption>
        Scan to verify
        <br />
        <code>{url}</code>
      </figcaption>
    </figure>
  );
}
