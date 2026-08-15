export type PropertyListRecipientSource = "Roadmap" | "Chat Intake";

export type PropertyListRecipient = {
  value: string;
  name: string;
  email: string;
  source: PropertyListRecipientSource;
};

export type PropertyListRecipientFilter = "all" | "roadmap" | "chat";

export function getLastName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.length > 1 ? parts.at(-1)! : parts[0] || "";
}

export function formatRecipientLastFirst(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return parts[0] || "Unnamed lead";
  return `${parts.at(-1)}, ${parts.slice(0, -1).join(" ")}`;
}

export function filterPropertyListRecipients(
  recipients: PropertyListRecipient[],
  lastNameSearch: string,
  sourceFilter: PropertyListRecipientFilter
) {
  const normalizedSearch = lastNameSearch.trim().toLocaleLowerCase();
  return recipients
    .filter((recipient) => {
      if (sourceFilter === "roadmap" && recipient.source !== "Roadmap") return false;
      if (sourceFilter === "chat" && recipient.source !== "Chat Intake") return false;
      return !normalizedSearch || getLastName(recipient.name).toLocaleLowerCase().includes(normalizedSearch);
    })
    .sort((a, b) => {
      const lastNameSort = getLastName(a.name).localeCompare(getLastName(b.name), undefined, { sensitivity: "base" });
      return lastNameSort || a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });
}
