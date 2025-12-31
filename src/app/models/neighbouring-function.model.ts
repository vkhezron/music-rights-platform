export type NeighbouringFunctionType = 'instrument' | 'voice' | 'recording';

export interface NeighbouringFunction {
  id: number;
  type: NeighbouringFunctionType;
  function_name: string;
  display_order: number;
  is_active: boolean;
}

export interface NeighbouringFunctionGroup {
  type: NeighbouringFunctionType;
  functions: NeighbouringFunction[];
}
