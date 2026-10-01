import { useParams } from 'react-router-dom';
import Catalog from './Catalog';

/**
 * `/category/:slug` adapter. The reserved `all` slug is a virtual "everything"
 * category, so the header's "Categories" link resolves to the full catalogue
 * instead of 404-ing on a slug that does not exist in the database.
 */
export default function Category() {
  const { slug } = useParams();

  if (slug === 'all') {
    return <Catalog heading="All products" headingHint="Browse the full catalogue" />;
  }

  return <Catalog categorySlug={slug} />;
}
