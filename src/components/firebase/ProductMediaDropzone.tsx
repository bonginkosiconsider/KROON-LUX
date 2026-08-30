"use client";

import { DragEvent, useRef, useState } from "react";

export type ProductMediaItem = { id: string; url: string; file?: File };

type ProductMediaDropzoneProps = {
  media: ProductMediaItem[];
  onAddFiles: (files: File[]) => void;
  onRemove: (id: string) => void;
  onReorder: (fromId: string, toId: string) => void;
};

const maxBytes = 5 * 1024 * 1024;

export function ProductMediaDropzone({ media, onAddFiles, onRemove, onReorder }: ProductMediaDropzoneProps) {
  const input = useRef<HTMLInputElement>(null);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const accept = (items: File[]) => {
    const valid = items.filter((file) => (file.type === "image/png" || file.type === "image/jpeg") && file.size <= maxBytes);
    if (valid.length) onAddFiles(valid);
  };
  const dropFiles = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); setIsDraggingFiles(false); accept(Array.from(event.dataTransfer.files)); };

  return <div className="product-media-manager">
    <div className={`media-dropzone${isDraggingFiles ? " is-dragging" : ""}`} onDragEnter={(event) => { event.preventDefault(); setIsDraggingFiles(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setIsDraggingFiles(false)} onDrop={dropFiles} onClick={() => input.current?.click()} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") input.current?.click(); }}>
      <input ref={input} className="sr-only" type="file" accept="image/png,image/jpeg" multiple onChange={(event) => { accept(Array.from(event.target.files ?? [])); event.currentTarget.value = ""; }} />
      <strong>Add product media</strong><span>Drag PNG/JPG files here, or click to browse</span><small>Maximum 5 MB per image</small>
    </div>
    {media.length ? <><p className="product-media-help">Drag images to change their order. The first image is the product cover.</p><div className="product-media-grid">{media.map((item, index) => <div className="product-media-item" key={item.id} draggable onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("application/x-product-media", item.id); }} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }} onDrop={(event) => { event.preventDefault(); const fromId = event.dataTransfer.getData("application/x-product-media"); if (fromId && fromId !== item.id) onReorder(fromId, item.id); }}>
      <img src={item.url} alt={item.file?.name ?? `Product image ${index + 1}`} />{index === 0 ? <span className="product-media-cover">Cover</span> : null}<span className="product-media-grip" aria-hidden="true">::</span><button type="button" className="product-media-remove" aria-label={`Remove image ${index + 1}`} onClick={() => onRemove(item.id)}>x</button>
    </div>)}</div></> : null}
  </div>;
}
