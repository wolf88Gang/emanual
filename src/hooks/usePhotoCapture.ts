import { useState, useCallback, useRef } from 'react';

interface PhotoCaptureState {
  photoFile: File | null;
  photoPreview: string | null;
  loading: boolean;
  error: string | null;
}

export function usePhotoCapture() {
  const [state, setState] = useState<PhotoCaptureState>({
    photoFile: null,
    photoPreview: null,
    loading: false,
    error: null,
  });
  
  const inputRef = useRef<HTMLInputElement>(null);

  const openCamera = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.click();
    }
  }, []);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setState(prev => ({
        ...prev,
        error: 'Please select an image file',
      }));
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setState(prev => ({
        ...prev,
        error: 'Image must be less than 10MB',
      }));
      return;
    }

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    
    setState({
      photoFile: file,
      photoPreview: previewUrl,
      loading: false,
      error: null,
    });
  }, []);

  const clearPhoto = useCallback(() => {
    if (state.photoPreview) {
      URL.revokeObjectURL(state.photoPreview);
    }
    setState({
      photoFile: null,
      photoPreview: null,
      loading: false,
      error: null,
    });
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, [state.photoPreview]);

  const reset = useCallback(() => {
    clearPhoto();
  }, [clearPhoto]);

  return {
    ...state,
    inputRef,
    openCamera,
    handleFileChange,
    clearPhoto,
    reset,
    hasPhoto: state.photoFile !== null,
  };
}
