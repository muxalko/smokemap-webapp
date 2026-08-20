import type { ReactElement } from "react";
import { MockedProvider, type MockedResponse } from "@apollo/client/testing";
import { render as testingLibraryRender } from "@testing-library/react";

export * from "@testing-library/react";
export const render = testingLibraryRender;
export function renderWithApollo(
  ui: ReactElement,
  mocks: MockedResponse[] = []
) {
  return testingLibraryRender(
    <MockedProvider mocks={mocks} addTypename={false}>
      {ui}
    </MockedProvider>
  );
}
