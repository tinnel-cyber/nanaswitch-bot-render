/**
 * @file wameet.$id.jsx
 * @description Route Remix dynamique /wameet/$id
 * Génération Open Graph et salon privé Wameet (Prompt 5)
 */

import React from "react";
import { useParams, useSearchParams } from "@remix-run/react";
import WameetRoomView from "../../src/components/wameet/WameetRoomView";

/**
 * 2. Génération Open Graph (Remix Route /wameet/$id)
 * Balises OG exigées :
 * - og:title : "Invitation Wameet de " + creatorName
 * - og:description : "Motif: " + reason + " | Heure: " + time
 */
export function meta({ params, location, data }) {
  const searchParams =
    typeof location?.search === "string"
      ? new URLSearchParams(location.search)
      : new URLSearchParams();

  const creatorName =
    searchParams.get("creator") || data?.creatorName || "Ibrahim Pousbila";
  const reason =
    searchParams.get("reason") ||
    data?.reason ||
    "Discussion & Synergie Business";
  const time = searchParams.get("time") || data?.time || "18:30 GMT";

  return [
    { title: `Invitation Wameet de ${creatorName}` },
    { property: "og:title", content: "Invitation Wameet de " + creatorName },
    {
      property: "og:description",
      content: "Motif: " + reason + " | Heure: " + time,
    },
    { property: "og:type", content: "video.other" },
    {
      property: "og:image",
      content: "https://nanasore.com/wameet-og-preview.png",
    },
  ];
}

/**
 * Loader optionnel Remix pour SSR des métadonnées
 */
export async function loader({ params, request }) {
  try {
    const url = new URL(request.url);
    const creatorName = url.searchParams.get("creator") || "Ibrahim Pousbila";
    const reason =
      url.searchParams.get("reason") || "Discussion & Synergie Business";
    const time = url.searchParams.get("time") || "18:30 GMT";

    return {
      wameetId: params.id,
      creatorName,
      reason,
      time,
    };
  } catch (e) {
    return {
      wameetId: params.id,
      creatorName: "Ibrahim Pousbila",
      reason: "Discussion & Synergie Business",
      time: "18:30 GMT",
    };
  }
}

/**
 * 3. Page d'invitation et Salon Wameet /wameet/$id
 */
export default function WameetRoomRoute() {
  const params = useParams();
  const [searchParams] = useSearchParams();

  const wameetId = params.id || "wameet-salon-prive";
  const creatorName = searchParams.get("creator") || "Ibrahim Pousbila";
  const reason =
    searchParams.get("reason") || "Discussion & Synergie Business";
  const time = searchParams.get("time") || "18:30 GMT";

  return (
    <WameetRoomView
      wameetId={wameetId}
      creatorName={creatorName}
      reason={reason}
      time={time}
      onBack={() => {
        if (typeof window !== "undefined") {
          window.location.href = "/wameet";
        }
      }}
    />
  );
}
