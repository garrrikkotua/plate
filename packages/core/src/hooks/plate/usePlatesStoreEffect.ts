import { useEffect } from 'react';
import { PlateProps } from '../../components/plate/Plate';
import { Value } from '../../slate/editor/TEditor';
import { platesActions, platesSelectors } from '../../stores/plate/platesStore';

/**
 * On mount: create plate store and set it to the plates store.
 * If id is not defined, event id is used.
 * To avoid conflict between `unset` on unmount + `set` on mount (immer),
 * we run `set` in the next tick
 */
export const usePlatesStoreEffect = <V extends Value>(
  id?: string,
  props?: PlateProps<V>
) => {
  useEffect(() => {
    setTimeout(() => {
      if (!platesSelectors.has(id)) {
        platesActions.set(id!, props);
      }
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
};
