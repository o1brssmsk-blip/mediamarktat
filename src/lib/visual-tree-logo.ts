import type { BankDesignConfig, BankElement } from "./bank-design-schema";

function mapTree(node: BankElement, mapper: (element: BankElement) => BankElement): BankElement {
  const nextNode = mapper({ ...node });
  if (!nextNode.children?.length) {
    return nextNode;
  }

  return {
    ...nextNode,
    children: nextNode.children.map((child) => mapTree(child, mapper)),
  };
}

export function isLikelyLogoElement(element: Pick<BankElement, "id" | "type" | "attributes">, logoFile?: string): boolean {
  if (element.type !== "image") {
    return false;
  }

  const id = element.id.toLowerCase();
  const src = element.attributes?.src?.toLowerCase() ?? "";
  const normalizedLogo = logoFile?.toLowerCase() ?? "";

  return id.includes("logo") || src === "placeholder" || (Boolean(normalizedLogo) && src === normalizedLogo) || src.includes("logo");
}

export function getNormalizedLogoStyles(styles: Record<string, string> = {}): Record<string, string> {
  return {
    ...styles,
    display: styles.display || "block",
    width: styles.width || "100%",
    height: styles.height || "100%",
    maxWidth: styles.maxWidth || "100%",
    maxHeight: styles.maxHeight || "100%",
    objectFit: "contain",
    objectPosition: styles.objectPosition || "left center",
  };
}

export function normalizeDesignLogoStyles(design: BankDesignConfig | undefined, logoFile?: string): BankDesignConfig | undefined {
  if (!design?.visualTree) {
    return design;
  }

  return {
    ...design,
    visualTree: mapTree(design.visualTree, (element) => {
      if (!isLikelyLogoElement(element, logoFile)) {
        return element;
      }

      const attributes = { ...(element.attributes ?? {}) };
      if (attributes.src === "placeholder" && logoFile) {
        attributes.src = logoFile;
      }

      return {
        ...element,
        attributes,
        styles: getNormalizedLogoStyles(element.styles),
      };
    }),
  };
}

export function getRenderableImageProps(element: BankElement, logoFile?: string, altText?: string) {
  const attributes = { ...(element.attributes ?? {}) };

  if (attributes.src === "placeholder" && logoFile) {
    attributes.src = logoFile;
  }

  if (isLikelyLogoElement(element, logoFile) && altText && !attributes.alt) {
    attributes.alt = altText;
  }

  return {
    ...attributes,
    style: isLikelyLogoElement(element, logoFile) ? getNormalizedLogoStyles(element.styles) : element.styles,
  };
}
