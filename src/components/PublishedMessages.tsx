import React, { useEffect, useState } from 'react';
import { getPublishedContent, type PublicContent } from '../data/publishedContent';

export function PublishedMessages({ type }: { type: 'announcement' | 'event' }) {
  const [items, setItems] = useState<PublicContent[]>([]);
  useEffect(() => {
    let active = true;
    getPublishedContent().then(result => { if (active) setItems(result.items.filter(item => item.type === type)); }).catch(() => {});
    return () => { active = false; };
  }, [type]);
  if (!items.length) return null;
  return <section className="published-messages" aria-label={type === 'event' ? 'Sự kiện mới' : 'Thông báo mới'}>{items.map(item => <article className="surface" key={item.id}><span className="eyebrow">{type === 'event' ? 'SỰ KIỆN' : 'THÔNG BÁO'}</span><h2>{item.title}</h2><p>{item.description}</p><details><summary>Xem chi tiết</summary><div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: 1.8, marginTop: 12 }}>{item.body}</div></details></article>)}</section>;
}
