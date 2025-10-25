'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { AppState, Product, PollResult, ScoreCalculation, DataCollectionMethod } from '@/lib/types';

interface AnalysisContextType {
  state: AppState;
  dispatch: React.Dispatch<AnalysisAction>;
}

type AnalysisAction =
  | { type: 'SET_ANALYSIS_TYPE'; payload: 'core5' | 'core6' }
  | { type: 'SET_CURRENT_STEP'; payload: 1 | 2 | 3 | 4 | 5 }
  | { type: 'NAVIGATE_TO_STEP'; payload: { step: 1 | 2 | 3 | 4 | 5; force?: boolean } }
  | { type: 'ADD_PRODUCT'; payload: Product }
  | { type: 'UPDATE_PRODUCT'; payload: { index: number; product: Product } }
  | { type: 'SET_POLL_RESULT'; payload: { type: 'main_image' | 'image_stack' | 'features'; result: PollResult } }
  | { type: 'SET_CALCULATIONS'; payload: ScoreCalculation[] }
  | { type: 'SET_CAN_PROCEED'; payload: boolean }
  | { type: 'SET_CURRENT_PRODUCT_INDEX'; payload: number }
  | { type: 'SET_COLLECTION_METHOD'; payload: DataCollectionMethod }
  | { type: 'SET_PRODUCTS_BULK'; payload: Product[] }
  | { type: 'SET_PREPARED_BY'; payload: string }
  | { type: 'SET_PRODUCT_CATEGORY'; payload: string }
  | { type: 'RESET_ANALYSIS' };

// Save state to localStorage (all data including images)
const saveStateToStorage = (state: AppState) => {
  if (typeof window !== 'undefined') {
    // Normalize image format before saving to ensure consistency between manual and automatic entry
    const normalizedState = {
      ...state,
      products: state.products.map(p => {
        // Debug logging
        const mainImageBefore = p.mainImage;
        const mainImageAfter = typeof p.mainImage === 'string' 
          ? p.mainImage 
          : p.mainImage && typeof p.mainImage === 'object' && p.mainImage.base64
          ? p.mainImage.base64
          : '';
        
        if (mainImageBefore && !mainImageAfter) {
          console.warn(`[AnalysisContext] Lost mainImage for product ${p.asin}:`, {
            originalType: typeof mainImageBefore,
            originalIsObject: typeof mainImageBefore === 'object',
            hasBase64: typeof mainImageBefore === 'object' && mainImageBefore.base64 ? 'yes' : 'no'
          });
        }
        
        return {
          ...p,
          // Normalize mainImage: extract base64 string from object format
          mainImage: mainImageAfter,
          // Normalize additionalImages: extract base64 strings from object format
          additionalImages: (p.additionalImages || []).map(img => 
            typeof img === 'string' 
              ? img 
              : img && typeof img === 'object' && img.base64
              ? img.base64
              : ''
          ).filter(img => img !== '')
        };
      })
    };
    
    // Check size before saving
    const jsonString = JSON.stringify(normalizedState);
    const sizeInMB = new Blob([jsonString]).size / (1024 * 1024);
    
    if (sizeInMB > 4) {
      console.warn(`⚠️ Large state size: ${sizeInMB.toFixed(2)}MB. Approaching localStorage limit (5-10MB)`);
    }
    
    try {
      localStorage.setItem('amazon-analysis-state', jsonString);
    } catch (error: any) {
      // Handle QuotaExceededError gracefully
      if (error.name === 'QuotaExceededError' || error.code === 22) {
        console.warn('localStorage quota exceeded. Attempting to clear old data and retry...');
        // Clear old data and try once more
        try {
          localStorage.removeItem('amazon-analysis-state');
          localStorage.setItem('amazon-analysis-state', JSON.stringify(normalizedState));
          console.log('Successfully saved after clearing old data');
        } catch (retryError) {
          console.error('Failed to save state after clearing old data:', retryError);
          // Last resort: try to save without images, but warn the user first
          const userConfirm = window.confirm(
            '⚠️ CRITICAL WARNING: The storage quota has been exceeded.\n\n' +
            'Your images cannot be saved. You have two options:\n\n' +
            '1. OK: Save the data WITHOUT images (you will need to re-enter them later)\n' +
            '2. Cancel: This will prevent saving and you may lose your work\n\n' +
            'We recommend clicking Cancel and reducing the number of products or image sizes.'
          );
          
          if (userConfirm) {
            try {
              const stateWithoutImages = {
                ...state,
                products: state.products.map(p => ({
                  ...p,
                  mainImage: '',
                  additionalImages: []
                }))
              };
              localStorage.setItem('amazon-analysis-state', JSON.stringify(stateWithoutImages));
              console.warn('⚠️ CRITICAL: Saved state without images as fallback due to localStorage quota');
              alert('Data saved WITHOUT images. You will need to re-enter them.');
            } catch (fallbackError) {
              console.error('Failed to save state even without images:', fallbackError);
              alert('Failed to save data. Please reduce the number of products or image sizes.');
            }
          } else {
            console.warn('User cancelled save operation due to storage quota exceeded');
            alert('Save cancelled. Your data is not saved. Please reduce product count or image sizes.');
          }
        }
      } else {
        console.error('Failed to save state to localStorage:', error);
      }
    }
  }
};

// Load state from localStorage on initialization
const loadStateFromStorage = (): AppState => {
  if (typeof window === 'undefined') {
    return {
      analysisType: null,
      currentStep: 1,
      products: [],
      polls: {
        mainImage: null,
        imageStack: null,
        features: null,
      },
      calculations: null,
      canProceed: false,
      currentProductIndex: 0,
      collectionMethod: 'automatic',
    };
  }

  try {
    const savedState = localStorage.getItem('amazon-analysis-state');
    if (savedState) {
      const parsed = JSON.parse(savedState);
      // Validate that the saved state has the required structure
      if (parsed && typeof parsed === 'object' && 'currentStep' in parsed) {
        return {
          ...parsed,
          // Ensure polls object exists
          polls: parsed.polls || {
            mainImage: null,
            imageStack: null,
            features: null,
          },
        };
      }
    }
  } catch (error) {
  }

  return {
    analysisType: null,
    currentStep: 1,
    products: [],
    polls: {
      mainImage: null,
      imageStack: null,
      features: null,
    },
    calculations: null,
    canProceed: false,
    currentProductIndex: 0,
    collectionMethod: 'automatic',
  };
};

const initialState: AppState = loadStateFromStorage();


function analysisReducer(state: AppState, action: AnalysisAction): AppState {
  let newState: AppState;
  
  switch (action.type) {
    case 'SET_ANALYSIS_TYPE':
      newState = {
        ...state,
        analysisType: action.payload,
        currentStep: 2,
        canProceed: true,
      };
      saveStateToStorage(newState);
      return newState;

    case 'SET_CURRENT_STEP':
      newState = {
        ...state,
        currentStep: action.payload,
      };
      saveStateToStorage(newState);
      return newState;

    case 'NAVIGATE_TO_STEP':
      const targetStep = action.payload.step;
      const force = action.payload.force || false;
      
      // Allow navigation to completed steps or current step
      const canNavigate = force || targetStep <= state.currentStep || validateStepCompletion(state, targetStep - 1);
      
      if (canNavigate) {
        newState = {
          ...state,
          currentStep: targetStep,
        };
        saveStateToStorage(newState);
        return newState;
      }
      
      return state;

    case 'ADD_PRODUCT':
      newState = {
        ...state,
        products: [...state.products, action.payload],
        currentProductIndex: state.currentProductIndex + 1,
      };
      saveStateToStorage(newState);
      return newState;

    case 'UPDATE_PRODUCT':
      const updatedProducts = [...state.products];
      updatedProducts[action.payload.index] = action.payload.product;
      newState = {
        ...state,
        products: updatedProducts,
      };
      saveStateToStorage(newState);
      return newState;

    case 'SET_POLL_RESULT':
      // Map poll types to state property names
      const pollKey = action.payload.type === 'main_image' ? 'mainImage' :
                     action.payload.type === 'image_stack' ? 'imageStack' :
                     action.payload.type === 'features' ? 'features' :
                     action.payload.type;
      
      newState = {
        ...state,
        polls: {
          ...state.polls,
          [pollKey]: action.payload.result,
        },
      };
      saveStateToStorage(newState);
      return newState;

    case 'SET_CALCULATIONS':
      newState = {
        ...state,
        calculations: action.payload,
      };
      saveStateToStorage(newState);
      return newState;

    case 'SET_CAN_PROCEED':
      newState = {
        ...state,
        canProceed: action.payload,
      };
      saveStateToStorage(newState);
      return newState;

    case 'SET_CURRENT_PRODUCT_INDEX':
      newState = {
        ...state,
        currentProductIndex: action.payload,
      };
      saveStateToStorage(newState);
      return newState;

    case 'SET_COLLECTION_METHOD':
      newState = {
        ...state,
        collectionMethod: action.payload,
      };
      saveStateToStorage(newState);
      return newState;

    case 'SET_PRODUCTS_BULK':
      newState = {
        ...state,
        products: action.payload,
        currentProductIndex: action.payload.length,
      };
      saveStateToStorage(newState);
      return newState;

    case 'SET_PREPARED_BY':
      newState = {
        ...state,
        preparedBy: action.payload,
      };
      saveStateToStorage(newState);
      return newState;

    case 'SET_PRODUCT_CATEGORY':
      newState = {
        ...state,
        productCategory: action.payload,
      };
      saveStateToStorage(newState);
      return newState;

    case 'SET_CURRENT_PRODUCT_INDEX':
      newState = {
        ...state,
        currentProductIndex: action.payload,
      };
      saveStateToStorage(newState);
      return newState;

    case 'RESET_ANALYSIS':
      // Clear localStorage when resetting
      if (typeof window !== 'undefined') {
        localStorage.removeItem('amazon-analysis-state');
      }
      // Return a fresh initial state, not the one loaded from localStorage
      return {
        analysisType: null,
        currentStep: 1,
        products: [],
        polls: {
          mainImage: null,
          imageStack: null,
          features: null,
        },
        calculations: null,
        canProceed: false,
        currentProductIndex: 0,
        collectionMethod: 'automatic',
        preparedBy: '',
        productCategory: '',
      };

    default:
      return state;
  }
}

const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined);

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(analysisReducer, initialState);

  return (
    <AnalysisContext.Provider value={{ state, dispatch }}>
      {children}
    </AnalysisContext.Provider>
  );
}

export function useAnalysis() {
  const context = useContext(AnalysisContext);
  if (context === undefined) {
    throw new Error('useAnalysis must be used within an AnalysisProvider');
  }
  return context;
}

// Validation helpers
export function validateStepCompletion(state: AppState, step: number): boolean {
  switch (step) {
    case 1:
      return state.analysisType !== null;
    
    case 2:
      if (state.analysisType === 'core6') {
        return state.products.length === 6; // User product + 5 competitors
      } else {
        return state.products.length === 5; // 5 competitors
      }
    
    case 3:
      return (
        state.polls.mainImage !== null &&
        state.polls.imageStack !== null &&
        state.polls.features !== null
      );
    
    case 4:
      return state.calculations !== null && state.calculations.length > 0;
    
    case 5:
      return state.calculations !== null;
    
    default:
      return false;
  }
}

export function getNextStep(state: AppState): number | null {
  const totalSteps = 5;
  
  for (let step = 1; step <= totalSteps; step++) {
    if (!validateStepCompletion(state, step)) {
      return step;
    }
  }
  
  return null; // All steps completed
}

export function getCurrentProductType(state: AppState): string {
  if (state.analysisType === 'core6') {
    if (state.currentProductIndex === 0) {
      return 'Your Product';
    } else {
      return `Competitor ${state.currentProductIndex}`;
    }
  } else {
    return `Competitor ${state.currentProductIndex + 1}`;
  }
}

export function getTotalProducts(state: AppState): number {
  return state.analysisType === 'core6' ? 6 : 5;
}
