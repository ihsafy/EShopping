import { useParams } from 'react-router-dom';
import Catalog from './Catalog';

export default function Category() {
  const { slug } = useParams();
  return <Catalog categorySlug={slug} />;
}
