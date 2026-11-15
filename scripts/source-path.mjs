// SPDX-FileCopyrightText: 2026 Thomas Vincent <thomasvincent@gmail.com>
// SPDX-License-Identifier: MIT

import { resolve } from 'node:path';

export function requiredSourcePath(variable) {
  const value = process.env[variable];
  if (!value) throw new Error(`Set ${variable} to an explicitly downloaded source file`);
  return resolve(value);
}
