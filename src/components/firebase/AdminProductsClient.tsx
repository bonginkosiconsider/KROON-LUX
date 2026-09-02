"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { ProductMediaDropzone, type ProductMediaItem } from "@/components/firebase/ProductMediaDropzone";
import { useAdminCategories } from "@/hooks/use-admin-categories";
import { useProducts } from "@/hooks/use-products";
import { useStoreTaxonomies } from "@/hooks/use-store-taxonomies";
import {
  slugify,
  type BackorderPolicy,
  type Product,
  type ProductAttribute,
  type ProductInput,
  type ProductStatus,
  type ProductStockStatus,
  type ProductType,
  type ProductVariation,
  type ProductVisibility,
} from "@/lib/firebase-models";
import { createProduct, removeProduct, updateProduct } from "@/services/firebase-products";
import { uploadProductImage } from "@/services/firebase-storage";

const tabs = ["General", "Inventory", "Attributes", "Variations", "SEO"] as const;
type Tab = typeof tabs[number];

type FormAttribute = ProductAttribute;
type FormVariation = {
  id: string;
  name: string;
  sku: string;
  price: string;
  salePrice: string;
  manageStock: boolean;
  inventoryCount: string;
  lowStockThreshold: string;
  stockStatus: ProductStockStatus;
  imageUrl: string;
  attributes: Record<string, string>;
};

type ProductFormState = {
  title: string;
  slug: string;
  productType: ProductType;
  price: string;
  salePrice: string;
  description: string;
  shortDescription: string;
  sku: string;
  manageStock: boolean;
  stockStatus: ProductStockStatus;
  inventoryCount: string;
  lowStockThreshold: string;
  backorders: BackorderPolicy;
  attributes: FormAttribute[];
  variations: FormVariation[];
  metaTitle: string;
  metaDescription: string;
  categories: string[];
  tags: string;
  status: ProductStatus;
  visibility: ProductVisibility;
  brandId: string;
  collectionIds: string[];
  featured: boolean;
};

const productTypeOptions: { value: ProductType; label: string }[] = [
  { value: "simple", label: "Simple" },
  { value: "variable", label: "Variable" },
  { value: "grouped", label: "Grouped" },
  { value: "external", label: "External / Affiliate" },
  { value: "downloadable", label: "Downloadable" },
  { value: "virtual", label: "Virtual" },
];

const stockStatusOptions: { value: ProductStockStatus; label: string }[] = [
  { value: "in-stock", label: "In stock" },
  { value: "out-of-stock", label: "Out of stock" },
  { value: "on-backorder", label: "On backorder" },
];

const backorderOptions: { value: BackorderPolicy; label: string }[] = [
  { value: "not-allowed", label: "Do not allow" },
  { value: "allowed-with-notice", label: "Allow but notify" },
  { value: "allowed", label: "Allow" },
];

const statusOptions: { value: ProductStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Active" },
  { value: "pending-review", label: "Pending review" },
  { value: "private", label: "Private" },
];

const visibilityOptions: { value: ProductVisibility; label: string }[] = [
  { value: "shop-and-search", label: "Shop and search" },
  { value: "shop-only", label: "Shop only" },
  { value: "search-only", label: "Search only" },
  { value: "hidden", label: "Hidden" },
];

type CatalogView = "list" | "grid";

type BulkProductValues = {
  price: string;
  salePrice: string;
  inventoryCount: string;
};

type ListStatus = "all" | ProductStatus;
type ProductSort = "newest" | "oldest" | "title-asc" | "title-desc" | "inventory-desc" | "inventory-asc" | "price-desc" | "price-asc";
type CsvRow = Record<string, string>;

const catalogPageSize = 20;

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function parseCsv(text: string): CsvRow[] {
  const rows: string[][] = [];
  let row: string[] = [], value = "", quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"' && quoted && text[index + 1] === '"') { value += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) { row.push(value.trim()); value = ""; }
    else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(value.trim()); if (row.some(Boolean)) rows.push(row); row = []; value = "";
    } else value += character;
  }
  row.push(value.trim()); if (row.some(Boolean)) rows.push(row);
  const [headers, ...data] = rows;
  if (!headers?.length) return [];
  return data.map((cells) => Object.fromEntries(headers.map((header, index) => [header.toLowerCase().trim(), cells[index] ?? ""])));
}

const emptyForm: ProductFormState = {
  title: "",
  slug: "",
  productType: "simple",
  price: "",
  salePrice: "",
  description: "",
  shortDescription: "",
  sku: "",
  manageStock: false,
  stockStatus: "in-stock",
  inventoryCount: "0",
  lowStockThreshold: "5",
  backorders: "not-allowed",
  attributes: [],
  variations: [],
  metaTitle: "",
  metaDescription: "",
  categories: [],
  tags: "",
  // New products should be available in the storefront after saving. Admins can
  // still choose Draft (or another status) before publishing when needed.
  status: "published",
  visibility: "shop-and-search",
  brandId: "",
  collectionIds: [],
  featured: false,
};

function text(value?: string | null) {
  return value ?? "";
}

function numberText(value?: number) {
  return value === undefined || value === null ? "" : String(value);
}

function numberOrZero(value: string) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function numberOrUndefined(value: string) {
  if (!value.trim()) return undefined;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

function splitValues(values: string) {
  return [...new Set(values.split(",").map((value) => value.trim()).filter(Boolean))];
}

function cleanAttributes(attributes: FormAttribute[]) {
  return attributes.flatMap((attribute) => {
    const name = attribute.name.trim();
    const values = splitValues(attribute.values).join(", ");
    if (!name || !values) return [];
    return [{ name, values, usedForVariations: attribute.usedForVariations === true }];
  });
}

function variationName(attributes: Record<string, string>) {
  return Object.entries(attributes).map(([name, value]) => `${name}: ${value}`).join(" / ");
}

function variationSignature(attributes: Record<string, string>) {
  return Object.entries(attributes)
    .map(([name, value]) => `${name.toLowerCase()}=${value.toLowerCase()}`)
    .sort()
    .join("|");
}

function variationMatrix(attributes: FormAttribute[]) {
  const usable = cleanAttributes(attributes)
    .filter((attribute) => attribute.usedForVariations)
    .map((attribute) => ({ name: attribute.name, values: splitValues(attribute.values) }))
    .filter((attribute) => attribute.values.length > 0);

  if (!usable.length) return [];

  return usable.reduce<Record<string, string>[]>(
    (combinations, attribute) => combinations.flatMap((combination) => attribute.values.map((value) => ({ ...combination, [attribute.name]: value }))),
    [{}],
  );
}

function newVariationId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function variationFromProduct(variation: ProductVariation): FormVariation {
  return {
    id: variation.id,
    name: variation.name,
    sku: text(variation.sku),
    price: numberText(variation.price),
    salePrice: numberText(variation.salePrice),
    manageStock: variation.manageStock !== false,
    inventoryCount: numberText(variation.inventoryCount),
    lowStockThreshold: numberText(variation.lowStockThreshold ?? 5),
    stockStatus: variation.stockStatus ?? "in-stock",
    imageUrl: text(variation.imageUrl),
    attributes: variation.attributes ?? {},
  };
}

function formFromProduct(product: Product | null): ProductFormState {
  if (!product) {
    return {
      ...emptyForm,
      attributes: [],
      variations: [],
      categories: [],
      collectionIds: [],
    };
  }

  return {
    title: product.title,
    slug: product.slug,
    productType: product.productType ?? "simple",
    price: numberText(product.price),
    salePrice: numberText(product.salePrice),
    description: product.description,
    shortDescription: text(product.shortDescription),
    sku: text(product.sku),
    manageStock: product.manageStock === true,
    stockStatus: product.stockStatus ?? "in-stock",
    inventoryCount: numberText(product.inventoryCount),
    lowStockThreshold: numberText(product.lowStockThreshold ?? 5),
    backorders: product.backorders ?? "not-allowed",
    attributes: (product.attributes ?? []).map((attribute) => ({ ...attribute })),
    variations: (product.variations ?? []).map(variationFromProduct),
    metaTitle: text(product.metaTitle),
    metaDescription: text(product.metaDescription),
    categories: product.categories?.length ? [...product.categories] : product.category ? [product.category] : [],
    tags: product.tags?.join(", ") ?? "",
    status: product.status ?? (product.isPublished ? "published" : "draft"),
    visibility: product.visibility ?? "shop-and-search",
    brandId: text(product.brandId),
    collectionIds: product.collectionIds ? [...product.collectionIds] : [],
    featured: product.featured,
  };
}

function variationPayload(variation: FormVariation, parentPrice: string): ProductVariation {
  const attributes = Object.fromEntries(
    Object.entries(variation.attributes)
      .map(([key, value]) => [key.trim(), value.trim()])
      .filter(([key, value]) => key && value),
  );

  return {
    id: variation.id,
    name: variation.name.trim() || variationName(attributes) || "Variation",
    sku: variation.sku.trim(),
    price: numberOrZero(variation.price || parentPrice),
    salePrice: numberOrUndefined(variation.salePrice),
    manageStock: variation.manageStock,
    inventoryCount: numberOrZero(variation.inventoryCount),
    lowStockThreshold: numberOrZero(variation.lowStockThreshold || "5"),
    stockStatus: variation.stockStatus,
    imageUrl: variation.imageUrl.trim() || undefined,
    attributes,
  };
}

function money(value: number) {
  return `R ${value.toFixed(2)}`;
}

function productPriceLabel(product: Product) {
  const prices = product.productType === "variable" && product.variations?.length
    ? product.variations.map((variation) => variation.salePrice ?? variation.price).filter((value) => Number.isFinite(value))
    : [product.salePrice ?? product.price];

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? money(min) : `${money(min)} - ${money(max)}`;
}

function productStockLabel(product: Product) {
  if (product.productType === "variable" && product.variations?.length) {
    const quantity = product.variations.reduce((total, variation) => total + (variation.manageStock === false ? 0 : variation.inventoryCount), 0);
    return `${quantity} across ${product.variations.length}`;
  }
  if (!product.manageStock) return product.stockStatus === "out-of-stock" ? "Out of stock" : "Not tracked";
  return `${product.inventoryCount} in stock`;
}

function friendlySaveError(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "SKU_ALREADY_EXISTS") return "A product or variation already uses that SKU.";
    if (error.message === "SLUG_ALREADY_EXISTS") return "Another product already uses that slug.";
    if (error.message === "PRODUCT_NOT_FOUND") return "This product no longer exists.";
    if (error.message.includes("permission-denied")) return "Your admin account is not allowed to write products. Check the Firebase admin role and Firestore rules.";
    if (error.message.includes("failed-precondition")) return "Firebase could not complete the save. Refresh the page and try again.";
    if (error.message.includes("network")) return "The network connection was interrupted. Check your connection and try again.";
    return error.message;
  }
  return "Please try again.";
}

function productStatusValue(product: Pick<Product, "status" | "isPublished">) {
  return product.status ?? (product.isPublished ? "published" : "draft");
}

function productStatusLabel(product: Pick<Product, "status" | "isPublished">) {
  const value = productStatusValue(product);
  return statusOptions.find((option) => option.value === value)?.label ?? (value === "published" ? "Published" : "Draft");
}

function duplicateProductInput(product: Product): ProductInput {
  const duplicateTitle = product.title.trim().replace(/\s+Copy(?:\s+\d+)?$/i, "").trim() || product.title.trim();
  const categories = product.categories?.length ? [...product.categories] : product.category ? [product.category] : ["Uncategorized"];

  return {
    title: `${duplicateTitle} Copy`,
    slug: "",
    description: product.description ?? "",
    price: product.price,
    salePrice: product.salePrice,
    productType: product.productType ?? "simple",
    shortDescription: product.shortDescription ?? "",
    sku: "",
    manageStock: product.manageStock ?? false,
    stockStatus: product.stockStatus ?? "in-stock",
    lowStockThreshold: product.lowStockThreshold ?? 5,
    backorders: product.backorders ?? "not-allowed",
    weight: product.weight,
    dimensions: product.dimensions ? { ...product.dimensions } : undefined,
    shippingClass: product.shippingClass ?? "",
    attributes: (product.attributes ?? []).map((attribute) => ({ ...attribute })),
    variations: (product.variations ?? []).map((variation) => ({
      id: newVariationId(),
      name: variation.name,
      sku: "",
      price: variation.price,
      salePrice: variation.salePrice,
      manageStock: variation.manageStock ?? true,
      inventoryCount: variation.inventoryCount,
      lowStockThreshold: variation.lowStockThreshold ?? 5,
      stockStatus: variation.stockStatus ?? "in-stock",
      imageUrl: undefined,
      weight: variation.weight,
      dimensions: variation.dimensions ? { ...variation.dimensions } : undefined,
      attributes: variation.attributes ? { ...variation.attributes } : {},
    })),
    metaTitle: product.metaTitle ?? "",
    metaDescription: product.metaDescription ?? "",
    categories,
    tags: product.tags ? [...product.tags] : [],
    status: product.status ?? (product.isPublished ? "published" : "draft"),
    visibility: product.visibility ?? "shop-and-search",
    category: categories[0] ?? "Uncategorized",
    brandId: product.brandId ?? "",
    brandName: product.brandName ?? "",
    collectionIds: product.collectionIds ? [...product.collectionIds] : [],
    inventoryCount: product.inventoryCount,
    imageUrls: [],
    isPublished: product.isPublished,
    featured: product.featured,
  };
}

function uniqueDuplicateSlug(baseSlug: string, usedSlugs: Set<string>) {
  const root = slugify(baseSlug) || "product";
  const candidates = [root, `${root}-copy`, `${root}-copy-2`, `${root}-copy-3`, `${root}-copy-4`, `${root}-copy-5`];
  for (const candidate of candidates) {
    if (!usedSlugs.has(candidate)) return candidate;
  }

  let attempt = 1;
  let candidate = `${root}-copy-${attempt}`;
  while (usedSlugs.has(candidate)) {
    attempt += 1;
    candidate = `${root}-copy-${attempt}`;
  }
  return candidate;
}

export function AdminProductsClient() {
  const { products, loading, error } = useProducts(false);
  const searchParams = useSearchParams();
  const categoryOptions = useAdminCategories();
  const { items: brands } = useStoreTaxonomies("brands");
  const { items: collections } = useStoreTaxonomies("collections");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductFormState>(() => formFromProduct(null));
  const [slugTouched, setSlugTouched] = useState(false);
  const [tab, setTab] = useState<Tab>("General");
  const [media, setMedia] = useState<ProductMediaItem[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [catalogBusy, setCatalogBusy] = useState(false);
  const [catalogView, setCatalogView] = useState<CatalogView>("list");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ListStatus>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [brandFilter, setBrandFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [sort, setSort] = useState<ProductSort>("newest");
  const [page, setPage] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkEditorOpen, setBulkEditorOpen] = useState(false);
  const [bulkValues, setBulkValues] = useState<Record<string, BulkProductValues>>({});
  const [importRows, setImportRows] = useState<CsvRow[]>([]);
  const [moreOpen, setMoreOpen] = useState(false);
  const importInput = useRef<HTMLInputElement>(null);
  const deferredSearch = useDeferredValue(search);

  const matrixCount = useMemo(() => variationMatrix(form.attributes).length, [form.attributes]);
  const seoTitle = form.metaTitle.trim() || form.title.trim() || "Product title";
  const seoDescription = form.metaDescription.trim() || form.shortDescription.trim() || form.description.trim().slice(0, 160);
  const categories = useMemo(() => Array.from(new Set(products.flatMap((product) => product.categories?.length ? product.categories : [product.category]).filter(Boolean))).sort(), [products]);
  const brandsInCatalog = useMemo(() => Array.from(new Set(products.map((product) => product.brandName).filter(Boolean) as string[])).sort(), [products]);
  const filteredProducts = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    return products.filter((product) => {
      const inventory = product.productType === "variable" && product.variations?.length
        ? product.variations.reduce((sum, variant) => sum + (variant.manageStock === false ? 0 : variant.inventoryCount), 0)
        : product.inventoryCount;
      const searchable = [product.title, product.sku, product.brandName, product.productType, product.category, ...(product.categories ?? []), ...(product.tags ?? []), ...(product.variations ?? []).flatMap((variant) => [variant.name, variant.sku, ...Object.values(variant.attributes ?? {})])].filter(Boolean).join(" ").toLowerCase();
      return (statusFilter === "all" || productStatusValue(product) === statusFilter)
        && (categoryFilter === "all" || (product.categories ?? [product.category]).includes(categoryFilter))
        && (brandFilter === "all" || product.brandName === brandFilter)
        && (stockFilter === "all" || (stockFilter === "out" ? inventory <= 0 : stockFilter === "low" ? inventory > 0 && inventory <= (product.lowStockThreshold ?? 5) : inventory > (product.lowStockThreshold ?? 5)))
        && (!query || searchable.includes(query));
    }).sort((left, right) => {
      const inventory = (product: Product) => product.productType === "variable" && product.variations?.length ? product.variations.reduce((sum, variant) => sum + variant.inventoryCount, 0) : product.inventoryCount;
      const created = (product: Product) => product.createdAt?.toMillis?.() ?? 0;
      if (sort === "title-asc") return left.title.localeCompare(right.title);
      if (sort === "title-desc") return right.title.localeCompare(left.title);
      if (sort === "inventory-desc") return inventory(right) - inventory(left);
      if (sort === "inventory-asc") return inventory(left) - inventory(right);
      if (sort === "price-desc") return (right.salePrice ?? right.price) - (left.salePrice ?? left.price);
      if (sort === "price-asc") return (left.salePrice ?? left.price) - (right.salePrice ?? right.price);
      return sort === "oldest" ? created(left) - created(right) : created(right) - created(left);
    });
  }, [brandFilter, categoryFilter, deferredSearch, products, sort, statusFilter, stockFilter]);
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / catalogPageSize));
  const visibleProducts = filteredProducts.slice(page * catalogPageSize, (page + 1) * catalogPageSize);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedProducts = useMemo(() => products.filter((product) => selectedSet.has(product.id)), [products, selectedSet]);
  const allSelected = visibleProducts.length > 0 && visibleProducts.every((product) => selectedSet.has(product.id));
  useEffect(() => {
    const editId = searchParams.get("edit");
    const product = editId ? products.find((item) => item.id === editId) : null;
    if (product && !editorOpen) startEditor(product);
  }, [editorOpen, products, searchParams]);
  function loadEditorProduct(next: Product | null) {
    setMedia((current) => {
      current.forEach((item) => {
        if (item.file) URL.revokeObjectURL(item.url);
      });
      return (next?.imageUrls ?? []).map((url, index) => ({ id: `saved-${index}-${url}`, url }));
    });
    setEditing(next);
    setForm(formFromProduct(next));
    setSlugTouched(Boolean(next?.slug));
    setTab("General");
  }

  function startEditor(next: Product | null) {
    loadEditorProduct(next);
    setSelectedIds([]);
    setEditorOpen(true);
    setMessage("");
  }

  function closeEditor() {
    loadEditorProduct(null);
    setSelectedIds([]);
    setEditorOpen(false);
  }

  function updateTitle(title: string) {
    setForm((current) => ({ ...current, title, slug: slugTouched ? current.slug : slugify(title) }));
  }

  function updateAttribute(index: number, patch: Partial<FormAttribute>) {
    setForm((current) => ({
      ...current,
      attributes: current.attributes.map((attribute, itemIndex) => itemIndex === index ? { ...attribute, ...patch } : attribute),
    }));
  }

  function removeAttribute(index: number) {
    setForm((current) => ({ ...current, attributes: current.attributes.filter((_, itemIndex) => itemIndex !== index) }));
  }

  function updateVariation(index: number, patch: Partial<FormVariation>) {
    setForm((current) => ({
      ...current,
      variations: current.variations.map((variation, itemIndex) => itemIndex === index ? { ...variation, ...patch } : variation),
    }));
  }

  function removeVariation(index: number) {
    setForm((current) => ({ ...current, variations: current.variations.filter((_, itemIndex) => itemIndex !== index) }));
  }

  function addManualVariation() {
    setForm((current) => ({
      ...current,
      productType: "variable",
      variations: [
        ...current.variations,
        {
          id: newVariationId(),
          name: `Variation ${current.variations.length + 1}`,
          sku: "",
          price: current.price,
          salePrice: current.salePrice,
          manageStock: true,
          inventoryCount: "0",
          lowStockThreshold: current.lowStockThreshold || "5",
          stockStatus: "out-of-stock",
          imageUrl: "",
          attributes: {},
        },
      ],
    }));
    setTab("Variations");
  }

  function generateVariations() {
    const combinations = variationMatrix(form.attributes);
    if (!combinations.length) {
      setMessage("Select at least one variation attribute with values.");
      setTab("Attributes");
      return;
    }

    setForm((current) => {
      const existing = new Map(current.variations.map((variation) => [variationSignature(variation.attributes), variation]));
      return {
        ...current,
        productType: "variable",
        variations: combinations.map((attributes) => {
          const match = existing.get(variationSignature(attributes));
          if (match) return { ...match, attributes, name: match.name || variationName(attributes) };
          return {
            id: newVariationId(),
            name: variationName(attributes),
            sku: "",
            price: current.price,
            salePrice: current.salePrice,
            manageStock: true,
            inventoryCount: "0",
            lowStockThreshold: current.lowStockThreshold || "5",
            stockStatus: "out-of-stock",
            imageUrl: "",
            attributes,
          };
        }),
      };
    });
    setTab("Variations");
    setMessage(`Generated ${combinations.length} variations.`);
  }

  function toggleCategory(name: string, checked: boolean) {
    setForm((current) => ({
      ...current,
      categories: checked ? [...new Set([...current.categories, name])] : current.categories.filter((item) => item !== name),
    }));
  }

  function toggleCollection(id: string, checked: boolean) {
    setForm((current) => ({
      ...current,
      collectionIds: checked ? [...new Set([...current.collectionIds, id])] : current.collectionIds.filter((item) => item !== id),
    }));
  }

  function addMedia(files: File[]) {
    setMedia((current) => [...current, ...files.map((file) => ({ id: `upload-${newVariationId()}`, file, url: URL.createObjectURL(file) }))]);
  }

  function removeMedia(id: string) {
    setMedia((current) => current.filter((item) => {
      if (item.id === id && item.file) URL.revokeObjectURL(item.url);
      return item.id !== id;
    }));
  }

  function reorderMedia(fromId: string, toId: string) {
    setMedia((current) => {
      const from = current.findIndex((item) => item.id === fromId);
      const to = current.findIndex((item) => item.id === toId);
      if (from < 0 || to < 0) return current;
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function toggleAll() {
    setSelectedIds((current) => allSelected
      ? current.filter((id) => !visibleProducts.some((product) => product.id === id))
      : [...new Set([...current, ...visibleProducts.map((product) => product.id)])]);
  }

  function exportProducts(scope: "all" | "filtered" | "selected") {
    const records = scope === "all" ? products : scope === "selected" ? selectedProducts : filteredProducts;
    const header = ["Product", "SKU", "Price", "Compare-at price", "Inventory", "Variants", "Category", "Product type", "Vendor", "Status", "Tags"];
    const content = records.map((product) => [
      product.title, product.sku, product.price, product.salePrice ?? "", productStockLabel(product), product.variations?.length ?? 0,
      (product.categories?.length ? product.categories : [product.category]).join(" | "), product.productType ?? "simple", product.brandName ?? "", productStatusValue(product), (product.tags ?? []).join(" | "),
    ].map(csvCell).join(","));
    const blob = new Blob([[header.join(","), ...content].join("\n")], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob); link.download = `kroon-luxe-products-${scope}.csv`; link.click(); URL.revokeObjectURL(link.href);
    setMessage(`${records.length} product${records.length === 1 ? "" : "s"} exported.`);
  }

  async function readImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const rows = parseCsv(await file.text());
    const invalid = rows.find((row) => !row.product?.trim() || !Number.isFinite(Number(row.price)) || Number(row.price) < 0);
    if (!rows.length || invalid) {
      setMessage("Import needs a CSV with Product and a non-negative Price column.");
      event.target.value = "";
      return;
    }
    setImportRows(rows);
    event.target.value = "";
  }

  async function confirmImport() {
    try {
      await withCatalogAction(async () => {
        await Promise.all(importRows.map((row) => createProduct({
          title: row.product.trim(), slug: "", description: row.description ?? "", shortDescription: "", price: Number(row.price),
          salePrice: row["compare-at price"] ? Number(row["compare-at price"]) : undefined, productType: (row["product type"] as ProductType) || "simple",
          sku: row.sku ?? "", manageStock: Boolean(row.inventory?.trim()), stockStatus: Number(row.inventory) <= 0 ? "out-of-stock" : "in-stock",
          inventoryCount: Number(row.inventory) || 0, lowStockThreshold: 5, backorders: "not-allowed", attributes: [], variations: [], metaTitle: "", metaDescription: "",
          categories: (row.category ?? "Uncategorized").split("|").map((value) => value.trim()).filter(Boolean), category: (row.category ?? "Uncategorized").split("|")[0].trim(),
          tags: (row.tags ?? "").split("|").map((value) => value.trim()).filter(Boolean), status: statusOptions.some((option) => option.value === row.status) ? row.status as ProductStatus : "draft",
          visibility: "shop-and-search", brandId: "", brandName: row.vendor ?? "", collectionIds: [], imageUrls: [], isPublished: row.status === "published", featured: false,
        })));
      });
      setMessage(`${importRows.length} product${importRows.length === 1 ? "" : "s"} imported.`);
      setImportRows([]);
    } catch (error) { setMessage(`Import could not be completed. ${friendlySaveError(error)}`); }
  }

  function openBulkEditor() {
    setBulkValues(Object.fromEntries(selectedProducts.map((product) => [product.id, {
      price: numberText(product.price),
      salePrice: numberText(product.salePrice),
      inventoryCount: numberText(product.inventoryCount),
    }])));
    setBulkEditorOpen(true);
    setMessage("");
  }

  function updateBulkValue(id: string, field: keyof BulkProductValues, value: string) {
    setBulkValues((current) => ({
      ...current,
      [id]: { ...current[id], [field]: value },
    }));
  }

  async function withCatalogAction(action: () => Promise<void>) {
    setCatalogBusy(true);
    try {
      await action();
    } finally {
      setCatalogBusy(false);
    }
  }

  async function updateProductStatus(product: Product, status: ProductStatus) {
    const label = statusOptions.find((option) => option.value === status)?.label ?? status;
    try {
      await withCatalogAction(async () => {
        await updateProduct(product.id, { status });
      });
      if (editing?.id === product.id) {
        setForm((current) => ({ ...current, status }));
      }
      setMessage(`${product.title} is now ${label.toLowerCase()}.`);
    } catch (error) {
      setMessage(`Product could not be updated. ${friendlySaveError(error)}`);
    }
  }

  async function removeCatalogProduct(product: Product) {
    const confirmed = confirm(`Delete ${product.title}?`);
    if (!confirmed) return;

    try {
      await withCatalogAction(async () => {
        await removeProduct(product.id);
      });
      if (editing?.id === product.id) closeEditor();
      setSelectedIds((current) => current.filter((id) => id !== product.id));
      setMessage(`${product.title} deleted.`);
    } catch (error) {
      setMessage(`Product could not be deleted. ${friendlySaveError(error)}`);
    }
  }

  async function duplicateCatalogProduct(product: Product) {
    const duplicate = duplicateProductInput(product);
    const nextSlug = uniqueDuplicateSlug(product.slug, new Set(products.map((item) => item.slug)));
    const duplicateTitle = `${product.title.trim().replace(/\s+Copy(?:\s+\d+)?$/i, "").trim() || product.title.trim()} Copy`;

    try {
      let duplicateId = "";
      await withCatalogAction(async () => {
        duplicateId = await createProduct({
          ...duplicate,
          slug: nextSlug,
          title: duplicateTitle,
        });
      });
      // Open the copied values immediately; the live subscription will reconcile
      // the row when Firestore publishes the new document.
      startEditor({
        ...product,
        ...duplicate,
        id: duplicateId,
        title: duplicateTitle,
        slug: nextSlug,
        imageUrls: [],
        createdAt: null,
        updatedAt: null,
      });
      setMessage(`${product.title} duplicated. You can edit the copy now.`);
    } catch (error) {
      setMessage(`Product could not be duplicated. ${friendlySaveError(error)}`);
    }
  }

  async function bulkUpdateStatus(status: ProductStatus) {
    if (!selectedProducts.length) return;
    const label = statusOptions.find((option) => option.value === status)?.label ?? status;

    try {
      await withCatalogAction(async () => {
        await Promise.all(selectedProducts.map((product) => updateProduct(product.id, { status })));
      });
      if (editing && selectedSet.has(editing.id)) {
        setForm((current) => ({ ...current, status }));
      }
      setSelectedIds([]);
      setMessage(`${selectedProducts.length} product${selectedProducts.length === 1 ? "" : "s"} moved to ${label.toLowerCase()}.`);
    } catch (error) {
      setMessage(`Products could not be updated. ${friendlySaveError(error)}`);
    }
  }

  async function saveBulkEdits() {
    if (!selectedProducts.length) return;

    const invalidProduct = selectedProducts.find((product) => {
      const values = bulkValues[product.id];
      const price = Number(values?.price);
      const quantity = Number(values?.inventoryCount);
      const salePrice = values?.salePrice.trim() ?? "";
      const salePriceNumber = Number(salePrice);
      return !values || !values.price.trim() || !Number.isFinite(price) || !Number.isInteger(quantity) || price < 0 || quantity < 0 || (Boolean(salePrice) && (!Number.isFinite(salePriceNumber) || salePriceNumber < 0));
    });
    if (invalidProduct) {
      setMessage("Each selected product needs a regular price and a quantity of zero or more.");
      return;
    }

    try {
      await withCatalogAction(async () => {
        await Promise.all(selectedProducts.map((product) => {
          const values = bulkValues[product.id];
          return updateProduct(product.id, {
            price: numberOrZero(values.price),
            salePrice: numberOrUndefined(values.salePrice),
            inventoryCount: numberOrZero(values.inventoryCount),
            manageStock: true,
          });
        }));
      });
      setBulkEditorOpen(false);
      setMessage(`${selectedProducts.length} product${selectedProducts.length === 1 ? "" : "s"} updated.`);
    } catch (error) {
      setMessage(`Products could not be updated. ${friendlySaveError(error)}`);
    }
  }

  async function bulkDelete() {
    if (!selectedProducts.length) return;
    if (!confirm(`Delete ${selectedProducts.length} selected product${selectedProducts.length === 1 ? "" : "s"}?`)) return;

    try {
      await withCatalogAction(async () => {
        await Promise.all(selectedProducts.map((product) => removeProduct(product.id)));
      });
      if (editing && selectedSet.has(editing.id)) closeEditor();
      setSelectedIds([]);
      setMessage(`${selectedProducts.length} product${selectedProducts.length === 1 ? "" : "s"} deleted.`);
    } catch (error) {
      setMessage(`Products could not be deleted. ${friendlySaveError(error)}`);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = form.title.trim();
    if (!title) {
      setMessage("Product name is required.");
      setTab("General");
      return;
    }
    if (!form.price.trim()) {
      setMessage("Regular price is required.");
      setTab("General");
      return;
    }

    const selectedCategories = form.categories.length ? form.categories : ["Uncategorized"];
    const cleanedVariations = form.productType === "variable" ? form.variations.map((variation) => variationPayload(variation, form.price)) : [];
    if (form.productType === "variable" && !cleanedVariations.length) {
      setMessage("Variable products need at least one variation.");
      setTab("Variations");
      return;
    }

    setSaving(true);
    setMessage("Saving product...");

    try {
      const uploaded = await Promise.all(media.map((item) => item.file ? uploadProductImage(item.file) : item.url));
      const brand = brands.find((item) => item.id === form.brandId);
      const payload: ProductInput = {
        title,
        slug: form.slug.trim() || slugify(title),
        productType: form.productType,
        price: numberOrZero(form.price),
        salePrice: numberOrUndefined(form.salePrice),
        description: form.description,
        shortDescription: form.shortDescription,
        sku: form.sku.trim(),
        manageStock: form.manageStock,
        stockStatus: form.stockStatus,
        inventoryCount: numberOrZero(form.inventoryCount),
        lowStockThreshold: numberOrZero(form.lowStockThreshold || "5"),
        backorders: form.backorders,
        attributes: cleanAttributes(form.attributes),
        variations: cleanedVariations,
        metaTitle: form.metaTitle,
        metaDescription: form.metaDescription,
        categories: selectedCategories,
        category: selectedCategories[0],
        tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        brandId: brand?.id ?? "",
        brandName: brand?.name ?? "",
        collectionIds: form.collectionIds,
        imageUrls: uploaded,
        status: form.status,
        visibility: form.visibility,
        isPublished: form.status === "published",
        featured: form.featured,
      };

      const wasEditing = Boolean(editing);
      if (editing) await updateProduct(editing.id, payload);
      else await createProduct(payload);

      closeEditor();
      setSelectedIds([]);
      setMessage(wasEditing ? "Product updated successfully." : "Product created successfully.");
    } catch (error) {
      console.error("[admin products] save failed", error);
      setMessage(`Could not save product. ${friendlySaveError(error)}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="product-manager">
      <div className="product-manager-heading">
        <div>
          <h2>{editorOpen ? (editing ? `Edit: ${editing.title}` : "Add product") : "Products"}</h2>
          <p>{editorOpen ? "Build catalog records with inventory, media, attributes, variations, taxonomies, and SEO." : "Manage your catalogue, inventory, and product availability."}</p>
        </div>
        <div className="admin-toolbar-actions">
          {!editorOpen ? <><button className="button button-secondary" onClick={() => exportProducts(selectedProducts.length ? "selected" : "filtered")} type="button">Export</button>
          <button className="button button-secondary" onClick={() => importInput.current?.click()} type="button">Import</button>
          <div className="more-actions"><button className="button button-secondary" aria-expanded={moreOpen} onClick={() => setMoreOpen((open) => !open)} type="button">More actions⌄</button>{moreOpen ? <div className="more-actions-menu"><button onClick={() => { exportProducts("all"); setMoreOpen(false); }} type="button">Export all products</button><button disabled={!selectedProducts.length} onClick={() => { openBulkEditor(); setMoreOpen(false); }} type="button">Bulk edit selected</button><button disabled={!selectedProducts.length} onClick={() => { bulkDelete(); setMoreOpen(false); }} type="button">Delete selected</button></div> : null}</div>
          <button className="button button-primary" onClick={() => startEditor(null)} type="button">Add product</button>
          <input accept=".csv,text/csv" aria-label="Import products CSV" className="sr-only" onChange={readImportFile} ref={importInput} type="file" /></> : null}
          {editorOpen ? (
            <button className="button button-secondary" onClick={closeEditor} type="button">
              Close editor
            </button>
          ) : null}
          <div aria-label="Catalog layout" className="admin-view-toggle" role="tablist">
            <button aria-pressed={catalogView === "list"} className={catalogView === "list" ? "active" : ""} onClick={() => setCatalogView("list")} type="button">
              List
            </button>
            <button aria-pressed={catalogView === "grid"} className={catalogView === "grid" ? "active" : ""} onClick={() => setCatalogView("grid")} type="button">
              Grid
            </button>
          </div>
        </div>
      </div>

      {editorOpen ? (
      <form className="product-editor" onSubmit={save}>
        <div className="product-editor-main">
          <nav className="product-tabs" aria-label="Product editor sections">
            {tabs.map((item) => (
              <button type="button" className={tab === item ? "active" : ""} onClick={() => setTab(item)} key={item}>
                {item}
              </button>
            ))}
          </nav>

          <section className="admin-panel editor-panel">
            {tab === "General" ? (
              <>
                <label>
                  Product name
                  <input value={form.title} onChange={(event) => updateTitle(event.target.value)} required />
                </label>
                <div className="form-grid">
                  <label>
                    Slug
                    <span className="field-action-row">
                      <input value={form.slug} onChange={(event) => { setSlugTouched(true); setForm((current) => ({ ...current, slug: slugify(event.target.value) })); }} required />
                      <button className="button button-secondary" type="button" onClick={() => { setSlugTouched(false); setForm((current) => ({ ...current, slug: slugify(current.title) })); }}>Regenerate</button>
                    </span>
                  </label>
                  <label>
                    Product type
                    <select value={form.productType} onChange={(event) => setForm((current) => ({ ...current, productType: event.target.value as ProductType }))}>
                      {productTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                  <label>
                    Regular price (R)
                    <input value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} type="number" min="0" step="0.01" required />
                  </label>
                  <label>
                    Sale price (R)
                    <input value={form.salePrice} onChange={(event) => setForm((current) => ({ ...current, salePrice: event.target.value }))} type="number" min="0" step="0.01" />
                  </label>
                </div>
                <label>
                  Full description
                  <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={9} />
                </label>
                <label>
                  Short description
                  <textarea value={form.shortDescription} onChange={(event) => setForm((current) => ({ ...current, shortDescription: event.target.value }))} rows={3} />
                </label>
              </>
            ) : null}

            {tab === "Inventory" ? (
              <>
                <label className="toggle-line">
                  <input type="checkbox" checked={form.manageStock} onChange={(event) => setForm((current) => ({ ...current, manageStock: event.target.checked }))} />
                  Track inventory?
                </label>
                <div className="form-grid">
                  <label>
                    SKU
                    <input value={form.sku} onChange={(event) => setForm((current) => ({ ...current, sku: event.target.value }))} placeholder="Auto-generated if blank" />
                  </label>
                  <label>
                    Stock status
                    <select value={form.stockStatus} onChange={(event) => setForm((current) => ({ ...current, stockStatus: event.target.value as ProductStockStatus }))}>
                      {stockStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                  <label>
                    Stock quantity
                    <input value={form.inventoryCount} onChange={(event) => setForm((current) => ({ ...current, inventoryCount: event.target.value }))} type="number" min="0" disabled={!form.manageStock} />
                  </label>
                  <label>
                    Low stock threshold
                    <input value={form.lowStockThreshold} onChange={(event) => setForm((current) => ({ ...current, lowStockThreshold: event.target.value }))} type="number" min="0" disabled={!form.manageStock} />
                  </label>
                  <label>
                    Backorders
                    <select value={form.backorders} onChange={(event) => setForm((current) => ({ ...current, backorders: event.target.value as BackorderPolicy }))}>
                      {backorderOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                </div>
              </>
            ) : null}

            {tab === "Attributes" ? (
              <div className="attribute-editor">
                <div className="editor-toolbar">
                  <strong>{form.attributes.length} attributes</strong>
                  <button type="button" className="button button-secondary" onClick={() => setForm((current) => ({ ...current, attributes: [...current.attributes, { name: "", values: "", usedForVariations: false }] }))}>Add attribute</button>
                </div>
                {form.attributes.length ? form.attributes.map((attribute, index) => (
                  <div className="attribute-row" key={index}>
                    <input value={attribute.name} onChange={(event) => updateAttribute(index, { name: event.target.value })} placeholder="Attribute name" aria-label="Attribute name" />
                    <input value={attribute.values} onChange={(event) => updateAttribute(index, { values: event.target.value })} placeholder="Values, separated by commas" aria-label="Attribute values" />
                    <label className="toggle-line compact">
                      <input type="checkbox" checked={attribute.usedForVariations === true} onChange={(event) => updateAttribute(index, { usedForVariations: event.target.checked })} />
                      Used for variations
                    </label>
                    <button type="button" className="text-button danger" onClick={() => removeAttribute(index)}>Remove</button>
                  </div>
                )) : <p className="empty-catalog">No attributes yet.</p>}
              </div>
            ) : null}

            {tab === "Variations" ? (
              <div className="variation-editor">
                <div className="editor-toolbar">
                  <strong>{form.variations.length} variations</strong>
                  <span>{matrixCount ? `${matrixCount} in matrix` : "No matrix"}</span>
                  <button type="button" className="button button-secondary" onClick={generateVariations}>Generate matrix</button>
                  <button type="button" className="button button-secondary" onClick={addManualVariation}>Add variation</button>
                </div>
                {form.productType !== "variable" ? <p className="empty-catalog">Set Product type to Variable before publishing variation rows.</p> : null}
                {form.variations.length ? (
                  <div className="variation-table-scroll">
                    <div className="variation-table">
                      <div className="variation-table-row variation-table-head">
                        <span>Title</span><span>Regular price (R)</span><span>Sale price (R)</span><span>SKU</span><span>On hand</span><span aria-label="Actions" />
                      </div>
                      {form.variations.map((variation, index) => (
                        <div className="variation-table-row" key={variation.id}>
                          <input aria-label={`Variation ${index + 1} title`} value={variation.name} onChange={(event) => updateVariation(index, { name: event.target.value })} placeholder={variationName(variation.attributes) || `Variation ${index + 1}`} />
                          <input aria-label={`${variation.name || `Variation ${index + 1}`} regular price`} value={variation.price} onChange={(event) => updateVariation(index, { price: event.target.value })} type="number" min="0" step="0.01" />
                          <input aria-label={`${variation.name || `Variation ${index + 1}`} sale price`} value={variation.salePrice} onChange={(event) => updateVariation(index, { salePrice: event.target.value })} type="number" min="0" step="0.01" />
                          <input aria-label={`${variation.name || `Variation ${index + 1}`} SKU`} value={variation.sku} onChange={(event) => updateVariation(index, { sku: event.target.value })} placeholder="Auto-generated" />
                          <input aria-label={`${variation.name || `Variation ${index + 1}`} quantity on hand`} value={variation.inventoryCount} onChange={(event) => updateVariation(index, { inventoryCount: event.target.value, manageStock: true })} type="number" min="0" step="1" />
                          <button type="button" className="text-button danger" onClick={() => removeVariation(index)}>Remove</button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : <p className="empty-catalog">No variations yet.</p>}
              </div>
            ) : null}

            {tab === "SEO" ? (
              <>
                <div className="form-grid">
                  <label>
                    Meta title
                    <input value={form.metaTitle} onChange={(event) => setForm((current) => ({ ...current, metaTitle: event.target.value }))} />
                  </label>
                  <label className="wide-field">
                    Meta description
                    <textarea value={form.metaDescription} onChange={(event) => setForm((current) => ({ ...current, metaDescription: event.target.value }))} rows={4} />
                  </label>
                </div>
                <div className="seo-preview">
                  <span>{form.slug ? `/products/${form.slug}` : "/products/product-slug"}</span>
                  <strong>{seoTitle}</strong>
                  <p>{seoDescription || "Search preview description"}</p>
                </div>
              </>
            ) : null}
          </section>
        </div>

        <aside className="product-editor-aside">
          <section className="admin-panel editor-panel">
            <h3>Publish</h3>
            <label>
              Status
              <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as ProductStatus }))}>
                {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label>
              Visibility
              <select value={form.visibility} onChange={(event) => setForm((current) => ({ ...current, visibility: event.target.value as ProductVisibility }))}>
                {visibilityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="toggle-line">
              <input type="checkbox" checked={form.featured} onChange={(event) => setForm((current) => ({ ...current, featured: event.target.checked }))} />
              Featured product
            </label>
          </section>

          <section className="admin-panel editor-panel">
            <h3>Categories & tags</h3>
            <div className="taxonomy-checklist">
              {categoryOptions.map((name) => (
                <label key={name}>
                  <input type="checkbox" checked={form.categories.includes(name)} onChange={(event) => toggleCategory(name, event.target.checked)} />
                  {name}
                </label>
              ))}
            </div>
            <label>
              Tags
              <input value={form.tags} onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))} placeholder="Comma-separated" />
            </label>
          </section>

          <section className="admin-panel editor-panel">
            <h3>Brand & collections</h3>
            <label>
              Brand
              <select value={form.brandId} onChange={(event) => setForm((current) => ({ ...current, brandId: event.target.value }))}>
                <option value="">No brand</option>
                {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
              </select>
            </label>
            <div className="taxonomy-checklist">
              {collections.map((collection) => (
                <label key={collection.id}>
                  <input type="checkbox" checked={form.collectionIds.includes(collection.id)} onChange={(event) => toggleCollection(collection.id, event.target.checked)} />
                  {collection.name}
                </label>
              ))}
            </div>
            <p className="product-taxonomy-help">Manage brands and collections from the admin navigation.</p>
          </section>

          <section className="admin-panel editor-panel">
            <h3>Product media</h3>
            <ProductMediaDropzone media={media} onAddFiles={addMedia} onRemove={removeMedia} onReorder={reorderMedia} />
          </section>

          <button className="button button-primary" type="submit" disabled={saving}>{saving ? "Saving..." : "Save product"}</button>

        </aside>
      </form>
      ) : null}

      {message ? <p className="form-message">{message}</p> : null}

      {importRows.length ? <section className="catalog-import-preview" aria-label="Import preview">
        <div><strong>Ready to import {importRows.length} products</strong><p>Review the first records below. Products are validated before they are added.</p></div>
        <div className="admin-actions"><button className="button button-primary" disabled={catalogBusy} onClick={confirmImport} type="button">{catalogBusy ? "Importing…" : "Confirm import"}</button><button className="button button-secondary" disabled={catalogBusy} onClick={() => setImportRows([])} type="button">Cancel</button></div>
        <p>{importRows.slice(0, 3).map((row) => row.product).join(" · ")}{importRows.length > 3 ? " …" : ""}</p>
      </section> : null}

      <section className="admin-panel product-list-panel">
        <div className="section-heading tight">
          <div>
            <p className="eyebrow">Catalog</p>
            <h2>All products</h2>
          </div>
          <span>{loading ? "Loading..." : `${filteredProducts.length} of ${products.length} products`}</span>
        </div>
        <div className="admin-catalog-toolbar">
          <div className="catalog-filters">
            <input aria-label="Search products" onChange={(event) => { setSearch(event.target.value); setPage(0); }} placeholder="Search products, SKU, vendor, tags…" value={search} />
            <select aria-label="Filter by status" onChange={(event) => { setStatusFilter(event.target.value as ListStatus); setPage(0); }} value={statusFilter}><option value="all">All statuses</option>{statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
            <select aria-label="Filter by category" onChange={(event) => { setCategoryFilter(event.target.value); setPage(0); }} value={categoryFilter}><option value="all">All categories</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select>
            <select aria-label="Filter by vendor" onChange={(event) => { setBrandFilter(event.target.value); setPage(0); }} value={brandFilter}><option value="all">All vendors</option>{brandsInCatalog.map((brand) => <option key={brand} value={brand}>{brand}</option>)}</select>
            <select aria-label="Filter by inventory" onChange={(event) => { setStockFilter(event.target.value); setPage(0); }} value={stockFilter}><option value="all">All inventory</option><option value="in">In stock</option><option value="low">Low stock</option><option value="out">Out of stock</option></select>
            <select aria-label="Sort products" onChange={(event) => { setSort(event.target.value as ProductSort); setPage(0); }} value={sort}><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="title-asc">Name A–Z</option><option value="title-desc">Name Z–A</option><option value="inventory-desc">Inventory highest</option><option value="inventory-asc">Inventory lowest</option><option value="price-desc">Price highest</option><option value="price-asc">Price lowest</option></select>
          </div>
          <p className="admin-catalog-summary">{selectedProducts.length ? `${selectedProducts.length} selected` : "Select products to apply bulk actions."}</p>
          <div className="admin-bulk-actions">
            {selectedProducts.length ? (
              <>
                <button className="button button-primary" disabled={catalogBusy} type="button" onClick={openBulkEditor}>
                  Bulk edit selected
                </button>
                <button className="button button-secondary" disabled={catalogBusy} type="button" onClick={() => bulkUpdateStatus("draft")}>
                  Draft selected
                </button>
                <button className="button button-primary" disabled={catalogBusy} type="button" onClick={() => bulkUpdateStatus("published")}>
                  Publish selected
                </button>
                <button className="button button-secondary danger" disabled={catalogBusy} type="button" onClick={bulkDelete}>
                  Delete selected
                </button>
                <button className="text-button" disabled={catalogBusy} type="button" onClick={() => setSelectedIds([])}>
                  Clear
                </button>
              </>
            ) : (
              <button className="button button-secondary" disabled={!products.length || catalogBusy} type="button" onClick={toggleAll}>
                Select all
              </button>
            )}
          </div>
        </div>

        {bulkEditorOpen ? (
          <section aria-label="Bulk product editor" className="bulk-product-editor">
            <div className="bulk-product-editor-heading">
              <div>
                <h3>Bulk edit products</h3>
                <p>Update quantity, sale price, and regular price for each selected product, then save them together.</p>
              </div>
              <button className="text-button" disabled={catalogBusy} onClick={() => setBulkEditorOpen(false)} type="button">Close</button>
            </div>
            <p className="bulk-product-editor-note">Saving quantity turns on inventory tracking. For variable products, these are the product-level values; edit variations separately for variation-specific stock and prices.</p>
            <div className="bulk-product-editor-scroll">
              <div className="bulk-product-editor-row bulk-product-editor-head">
                <span>Product</span>
                <span>Quantity</span>
                <span>Sale price (R)</span>
                <span>Regular price (R)</span>
              </div>
              {selectedProducts.map((product) => {
                const values = bulkValues[product.id];
                return (
                  <div className="bulk-product-editor-row" key={product.id}>
                    <strong>{product.title}</strong>
                    <input aria-label={`${product.title} quantity`} disabled={catalogBusy} min="0" onChange={(event) => updateBulkValue(product.id, "inventoryCount", event.target.value)} step="1" type="number" value={values?.inventoryCount ?? ""} />
                    <input aria-label={`${product.title} sale price`} disabled={catalogBusy} min="0" onChange={(event) => updateBulkValue(product.id, "salePrice", event.target.value)} step="0.01" type="number" value={values?.salePrice ?? ""} />
                    <input aria-label={`${product.title} regular price`} disabled={catalogBusy} min="0" onChange={(event) => updateBulkValue(product.id, "price", event.target.value)} required step="0.01" type="number" value={values?.price ?? ""} />
                  </div>
                );
              })}
            </div>
            <div className="bulk-product-editor-actions">
              <button className="button button-primary" disabled={catalogBusy} onClick={saveBulkEdits} type="button">{catalogBusy ? "Saving…" : "Save all changes"}</button>
              <button className="button button-secondary" disabled={catalogBusy} onClick={() => setBulkEditorOpen(false)} type="button">Cancel</button>
            </div>
          </section>
        ) : null}

        {error ? <div className="catalog-error"><strong>Unable to load products.</strong><button className="button button-secondary" onClick={() => window.location.reload()} type="button">Retry</button></div> : loading ? <div className="catalog-skeleton" aria-label="Loading products">{Array.from({ length: 6 }).map((_, index) => <div key={index} />)}</div> : catalogView === "list" ? (
          <div className="admin-table">
            <div className="admin-table-row product-table-row admin-table-head">
              <span>
                <label className="admin-row-select admin-row-select-head">
                  <input aria-label="Select all products" checked={allSelected} onChange={toggleAll} type="checkbox" />
                </label>
              </span>
              <span>Product</span>
              <span>Status</span>
              <span>Inventory</span>
              <span>Category</span>
              <span>Channels</span>
              <span>Product type</span>
              <span>Vendor</span>
              <span>Actions</span>
            </div>
            {visibleProducts.length ? visibleProducts.map((item) => {
              const nextStatus = productStatusValue(item) === "published" ? "draft" : "published";

              return (
                <div className={`admin-table-row product-table-row${selectedSet.has(item.id) ? " is-selected" : ""}`} key={item.id}>
                  <span>
                    <label className="admin-row-select">
                      <input aria-label={`Select ${item.title}`} checked={selectedSet.has(item.id)} onChange={() => toggleSelected(item.id)} type="checkbox" />
                    </label>
                  </span>
                  <span className="admin-product-listing">
                    {item.imageUrls[0] ? <img alt="" src={item.imageUrls[0]} /> : <span aria-hidden="true" className="admin-product-thumbnail-placeholder" />}
                    <button className="product-row-link" onClick={() => startEditor(item)} type="button">{item.title}<small>{item.sku || "No SKU"}</small></button>
                  </span>
                  <span>
                    <span className={`admin-status-pill admin-status-${productStatusValue(item)}`}>{productStatusLabel(item)}</span>
                  </span>
                  <span>{productStockLabel(item)}</span>
                  <span>{item.categories?.join(", ") || item.category || "No category"}</span>
                  <span>{item.collectionIds?.length ? item.collectionIds.length : "—"}</span>
                  <span>{productTypeOptions.find((option) => option.value === item.productType)?.label ?? "Simple"}</span>
                  <span>{item.brandName || "—"}</span>
                  <span className="admin-actions">
                    <button disabled={catalogBusy} type="button" className="text-button" onClick={() => startEditor(item)}>
                      Edit
                    </button>
                    <button disabled={catalogBusy} type="button" className="text-button" onClick={() => duplicateCatalogProduct(item)}>
                      Duplicate
                    </button>
                    <button disabled={catalogBusy} type="button" className="text-button" onClick={() => updateProductStatus(item, nextStatus)}>
                      {nextStatus === "published" ? "Publish" : "Draft"}
                    </button>
                    <button disabled={catalogBusy} type="button" className="text-button danger" onClick={() => removeCatalogProduct(item)}>
                      Delete
                    </button>
                  </span>
                </div>
              );
            }) : <p className="empty-catalog">{products.length ? "No products match your search and filters." : "No products have been created yet."}</p>}
          </div>
        ) : (
          <div className="admin-product-grid">
            {visibleProducts.length ? visibleProducts.map((item) => {
              const nextStatus = productStatusValue(item) === "published" ? "draft" : "published";

              return (
                <article className={`admin-product-card${selectedSet.has(item.id) ? " is-selected" : ""}`} key={item.id}>
                  <div className="admin-product-card-media">
                    {item.imageUrls[0] ? <img alt={item.title} src={item.imageUrls[0]} /> : <div className="product-image product-image-empty" aria-hidden="true" />}
                    <label className="admin-product-card-select">
                      <input checked={selectedSet.has(item.id)} onChange={() => toggleSelected(item.id)} type="checkbox" />
                    </label>
                    <span className={`admin-status-pill admin-status-${productStatusValue(item)}`}>{productStatusLabel(item)}</span>
                  </div>
                  <div className="admin-product-card-body">
                    <div>
                      <p className="eyebrow">{item.brandName || item.categories?.[0] || item.category}</p>
                      <h3>{item.title}</h3>
                      <p>{item.categories?.join(", ") || item.category}</p>
                    </div>
                    <div className="admin-product-card-meta">
                      <strong>{productPriceLabel(item)}</strong>
                      <span>{productStockLabel(item)}</span>
                    </div>
                    <div className="admin-actions">
                      <button disabled={catalogBusy} type="button" className="text-button" onClick={() => startEditor(item)}>
                        Edit
                      </button>
                      <button disabled={catalogBusy} type="button" className="text-button" onClick={() => duplicateCatalogProduct(item)}>
                        Duplicate
                      </button>
                      <button disabled={catalogBusy} type="button" className="text-button" onClick={() => updateProductStatus(item, nextStatus)}>
                        {nextStatus === "published" ? "Publish" : "Draft"}
                      </button>
                      <button disabled={catalogBusy} type="button" className="text-button danger" onClick={() => removeCatalogProduct(item)}>
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              );
            }) : <p className="empty-catalog">{products.length ? "No products match your search and filters." : "No products have been created yet."}</p>}
          </div>
        )}
        {filteredProducts.length ? <div className="catalog-pagination"><span>{page * catalogPageSize + 1}–{Math.min((page + 1) * catalogPageSize, filteredProducts.length)} of {filteredProducts.length} products</span><div><button className="button button-secondary" disabled={page === 0} onClick={() => setPage((current) => current - 1)} type="button">Previous</button><button className="button button-secondary" disabled={page + 1 >= totalPages} onClick={() => setPage((current) => current + 1)} type="button">Next</button></div></div> : null}
      </section>
    </div>
  );
}
