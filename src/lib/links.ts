/**
 * Where a category address leads. `components` is a category page;
 * `components/memory` is the same page opened on one of its sub-categories.
 */
export function categoryHref(path: string): string {
  const [slug, sub] = path.split('/');
  return sub ? `/category/${slug}?sub=${sub}` : `/category/${slug}`;
}
