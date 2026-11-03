import React from 'react';
import {
  DefaultSimulatorDetailModal,
  type DefaultSimulatorDetailModalProps,
} from '../../pages/default/components/DefaultSimulatorDetailModal';

type ThemedSimulatorDetailModalProps = DefaultSimulatorDetailModalProps;

/** Wraps DefaultSimulatorDetailModal for the default theme; other themes use the same UI for now. */
export function ThemedSimulatorDetailModal(props: ThemedSimulatorDetailModalProps) {
  return <DefaultSimulatorDetailModal {...props} />;
}
