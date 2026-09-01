"use client";

const allowedTags = new Set(["A", "B", "BR", "EM", "H2", "H3", "H4", "LI", "OL", "P", "STRONG", "UL"]);

export function sanitizeRichText(value: string) {
  if (typeof window === "undefined") return "";
  const documentValue = new DOMParser().parseFromString(value, "text/html");
  documentValue.body.querySelectorAll("*").forEach((element) => {
    if (!allowedTags.has(element.tagName)) {
      element.replaceWith(...Array.from(element.childNodes));
      return;
    }
    Array.from(element.attributes).forEach((attribute) => {
      const keepLink = element.tagName === "A" && (attribute.name === "href" || attribute.name === "target" || attribute.name === "rel");
      if (!keepLink) element.removeAttribute(attribute.name);
    });
    if (element.tagName === "A") {
      const href = element.getAttribute("href") ?? "";
      if (!/^(https?:\/\/|mailto:|tel:|\/)/i.test(href)) element.removeAttribute("href");
      if (element.getAttribute("target") === "_blank") element.setAttribute("rel", "noreferrer noopener");
    }
  });
  return documentValue.body.innerHTML;
}
