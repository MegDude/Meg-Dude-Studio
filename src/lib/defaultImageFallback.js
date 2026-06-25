export const FALLBACK_DESIGN_IMAGES = [
  {
    id: 'fallback-room',
    type: 'room',
    title: 'Default room',
    src: '/images/rooms/legends/empty-loft-01.jpeg',
    status: 'fallback',
  },
];

export const getDefaultImageRecoveryState = (loadedCount, failedCount) => {
  if (failedCount === 0) {
    return {
      warning: null,
      useFallback: false,
      canContinueBlank: false,
    };
  }

  return {
    warning: 'Default images could not be loaded. You can upload your own image or continue with a blank project.',
    useFallback: loadedCount === 0,
    canContinueBlank: true,
  };
};

export const canGenerateDesign = ({
  hasScene,
  editMode,
  removePrompt,
  activeProductCount,
  hasSelectedProduct,
  designBrief,
}) => {
  if (!hasScene) return false;
  if (editMode === 'remove') return removePrompt.trim().length > 0;
  return (activeProductCount > 0 || hasSelectedProduct) && designBrief.trim().length > 0;
};
