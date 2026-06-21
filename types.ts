/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export interface Product {
  id: number | string;
  name: string;
  imageUrl: string;
  brand?: string;
  type?: string;
  category?: string;
}
