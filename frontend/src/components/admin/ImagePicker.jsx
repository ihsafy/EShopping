import { useEffect, useMemo, useRef } from 'react';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';

const MAX_BYTES = 4 * 1024 * 1024; // matches the server-side multer limit
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

/**
 * Image picker with instant preview, type/size validation and removable
 * existing images. New files are handed to the parent, which uploads them
 * through POST /api/uploads right before the form is saved.
 */
export default function ImagePicker({
  existing = [],
  files = [],
  onFiles,
  onRemoveExisting,
  max = 4,
  label = 'Images',
  hint = 'JPG, PNG, WEBP, GIF or AVIF up to 4MB',
}) {
  const inputRef = useRef(null);

  const previews = useMemo(() => files.map((file) => ({ file, url: URL.createObjectURL(file) })), [files]);
  useEffect(
    () => () => {
      previews.forEach((entry) => URL.revokeObjectURL(entry.url));
    },
    [previews]
  );

  const pick = (event) => {
    const picked = [...event.target.files];
    event.target.value = '';
    const accepted = [];
    for (const file of picked) {
      if (!ACCEPTED.includes(file.type)) {
        toast.error(`${file.name}: only JPG, PNG, WEBP, GIF or AVIF images are allowed`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        toast.error(`${file.name}: image is larger than the 4MB limit`);
        continue;
      }
      accepted.push(file);
    }
    if (!accepted.length) return;
    if (existing.length + files.length + accepted.length > max) {
      toast.error(`You can keep up to ${max} images`);
      return;
    }
    onFiles([...files, ...accepted]);
  };

  return (
    <div className="admin-field">
      <label className="admin-field__label">{label}</label>

      <div className="admin-picker">
        {existing.map((url) => (
          <div key={url} className="admin-picker__item">
            <img src={url} alt="Current" />
            <button
              type="button"
              aria-label="Remove image"
              onClick={() => onRemoveExisting(url)}
              disabled={!onRemoveExisting}
            >
              <FiTrash2 size={13} />
            </button>
          </div>
        ))}

        {previews.map(({ file, url }) => (
          <div key={`${file.name}-${file.lastModified}`} className="admin-picker__item admin-picker__item--new">
            <img src={url} alt={file.name} title={file.name} />
            <button
              type="button"
              aria-label="Remove selected image"
              onClick={() => onFiles(files.filter((f) => f !== file))}
            >
              <FiTrash2 size={13} />
            </button>
          </div>
        ))}

        {existing.length + files.length < max && (
          <button type="button" className="admin-picker__add" onClick={() => inputRef.current?.click()}>
            <FiPlus size={16} />
            {existing.length + files.length === 0 ? 'Add image' : 'Add more'}
          </button>
        )}
      </div>

      <p className="admin-field__hint">{hint}</p>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(',')}
        multiple={max > 1}
        hidden
        onChange={pick}
      />
    </div>
  );
}
