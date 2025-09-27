import { useState, useCallback } from 'react';

export default function DesignPublishModal({
  isOpen,
  onClose,
  onSave,
  designData = null,
  initialValues = {},
}) {
  const [formData, setFormData] = useState({
    title: initialValues.title || '',
    description: initialValues.description || '',
    category: initialValues.category || 'Birthday',
    tags: initialValues.tags || '',
    price: initialValues.price || '0',
    status: initialValues.status || 'draft',
    thumbnail: initialValues.thumbnail || null,
    ...initialValues,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const categories = [
    'Birthday',
    'Wedding',
    'Anniversary',
    'Graduation',
    'Baby Shower',
    'Corporate',
    'Holiday',
    'Other',
  ];

  const statusOptions = [
    { value: 'draft', label: 'Save as Draft' },
    { value: 'pending-review', label: 'Submit for Review' },
    { value: 'published', label: 'Publish Immediately' },
  ];

  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }, [errors]);

  const validateForm = useCallback(() => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.trim().length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    const price = parseFloat(formData.price);
    if (isNaN(price) || price < 0) {
      newErrors.price = 'Price must be a valid number (0 or greater)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSave = useCallback(async () => {
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);

    try {
      const publishData = {
        ...formData,
        designData,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        price: parseFloat(formData.price),
      };

      const result = await onSave(publishData);

      if (result.success !== false) {
        onClose();
      } else {
        setErrors({ general: result.error?.message || 'Failed to save design' });
      }
    } catch (error) {
      console.error('Error saving design:', error);
      setErrors({ general: 'An error occurred while saving the design' });
    } finally {
      setIsSaving(false);
    }
  }, [formData, designData, onSave, onClose, validateForm]);

  const handleCancel = useCallback(() => {
    if (!isSaving) {
      onClose();
    }
  }, [isSaving, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && handleCancel()}>
      <div className="design-publish-modal" role="dialog" aria-labelledby="publish-modal-title">
        <header className="modal-header">
          <h2 id="publish-modal-title">Save Design to Marketplace</h2>
          <button
            type="button"
            className="close-btn"
            onClick={handleCancel}
            disabled={isSaving}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <div className="modal-content">
          {errors.general && (
            <div className="error-message" role="alert">
              {errors.general}
            </div>
          )}

          <form className="publish-form" onSubmit={(e) => e.preventDefault()}>
            <div className="form-group">
              <label htmlFor="design-title">
                Title <span className="required">*</span>
              </label>
              <input
                id="design-title"
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                disabled={isSaving}
                placeholder="Enter design title"
                aria-invalid={errors.title ? 'true' : 'false'}
                aria-describedby={errors.title ? 'title-error' : undefined}
              />
              {errors.title && (
                <div id="title-error" className="field-error" role="alert">
                  {errors.title}
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="design-description">
                Description <span className="required">*</span>
              </label>
              <textarea
                id="design-description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                disabled={isSaving}
                placeholder="Describe your design..."
                rows={3}
                aria-invalid={errors.description ? 'true' : 'false'}
                aria-describedby={errors.description ? 'description-error' : undefined}
              />
              {errors.description && (
                <div id="description-error" className="field-error" role="alert">
                  {errors.description}
                </div>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="design-category">Category</label>
                <select
                  id="design-category"
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  disabled={isSaving}
                >
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="design-price">Price (USD)</label>
                <input
                  id="design-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => handleInputChange('price', e.target.value)}
                  disabled={isSaving}
                  aria-invalid={errors.price ? 'true' : 'false'}
                  aria-describedby={errors.price ? 'price-error' : undefined}
                />
                {errors.price && (
                  <div id="price-error" className="field-error" role="alert">
                    {errors.price}
                  </div>
                )}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="design-tags">
                Tags (comma-separated)
              </label>
              <input
                id="design-tags"
                type="text"
                value={formData.tags}
                onChange={(e) => handleInputChange('tags', e.target.value)}
                disabled={isSaving}
                placeholder="elegant, modern, celebration"
              />
              <small className="form-help">
                Use tags to help users find your design (e.g., elegant, modern, celebration)
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="design-status">Publication Status</label>
              <select
                id="design-status"
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                disabled={isSaving}
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <small className="form-help">
                {formData.status === 'draft' && 'Save privately for later editing'}
                {formData.status === 'pending-review' && 'Submit for admin review before publishing'}
                {formData.status === 'published' && 'Make available immediately in marketplace'}
              </small>
            </div>
          </form>
        </div>

        <footer className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleCancel}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Design'}
          </button>
        </footer>
      </div>
    </div>
  );
}