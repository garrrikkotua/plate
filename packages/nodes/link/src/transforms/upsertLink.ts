import {
  findNode,
  getAboveNode,
  getEditorString,
  getNodeLeaf,
  getNodeProps,
  getPluginOptions,
  getPluginType,
  InsertNodesOptions,
  isDefined,
  isExpanded,
  PlateEditor,
  removeNodes,
  setNodes,
  UnwrapNodesOptions,
  Value,
  WrapNodesOptions,
} from '@udecode/plate-core';
import { ELEMENT_LINK, LinkPlugin } from '../createLinkPlugin';
import { TLinkElement } from '../types';
import { CreateLinkNodeOptions } from '../utils/index';
import { insertLink } from './insertLink';
import { unwrapLink } from './unwrapLink';
import { upsertLinkText } from './upsertLinkText';
import { wrapLink } from './wrapLink';

export type UpsertLinkOptions<
  V extends Value = Value
> = CreateLinkNodeOptions & {
  /**
   * If true, insert text when selection is in url.
   */
  insertTextInLink?: boolean;
  insertNodesOptions?: InsertNodesOptions<V>;
  unwrapNodesOptions?: UnwrapNodesOptions<V>;
  wrapNodesOptions?: WrapNodesOptions<V>;
};

/**
 * If selection in a link or is not url:
 * - insert text with url, exit
 * If selection is expanded or `update` in a link:
 * - remove link node, get link text
 * Then:
 * - insert link node
 */
export const upsertLink = <V extends Value>(
  editor: PlateEditor<V>,
  { url, text, insertTextInLink, insertNodesOptions }: UpsertLinkOptions<V>
) => {
  const at = editor.selection;

  if (!at) return;

  const linkAbove = getAboveNode<TLinkElement>(editor, {
    at,
    match: { type: getPluginType(editor, ELEMENT_LINK) },
  });

  // anchor and focus in link -> insert text
  if (insertTextInLink && linkAbove) {
    // we don't want to insert marks in links
    editor.insertText(url);
    return true;
  }

  const { isUrl } = getPluginOptions<LinkPlugin, V>(editor, ELEMENT_LINK);

  if (!isUrl?.(url)) {
    return;
  }

  if (isDefined(text) && !text.length) {
    text = url;
  }

  // edit the link url
  if (linkAbove) {
    if (url !== linkAbove[0]?.url) {
      setNodes<TLinkElement>(
        editor,
        { url },
        {
          at: linkAbove[1],
        }
      );
    }

    upsertLinkText(editor, { url, text });

    return true;
  }

  // selection contains at one edge edge or between the edges
  const linkEntry = findNode<TLinkElement>(editor, {
    at,
    match: { type: getPluginType(editor, ELEMENT_LINK) },
  });

  const [linkNode, linkPath] = linkEntry ?? [];

  let shouldReplaceText = false;

  if (linkPath && text?.length) {
    const linkText = getEditorString(editor, linkPath);

    if (text !== linkText) {
      shouldReplaceText = true;
    }
  }

  if (isExpanded(at)) {
    // anchor and focus in link
    if (linkAbove) {
      unwrapLink(editor, {
        at: linkAbove[1],
      });
    } else {
      unwrapLink(editor, {
        split: true,
      });
    }

    wrapLink(editor, {
      url,
    });

    upsertLinkText(editor, { url, text });

    return true;
  }

  if (shouldReplaceText) {
    removeNodes(editor, {
      at: linkPath,
    });
  }

  const props = getNodeProps(linkNode ?? ({} as any));

  const path = editor.selection?.focus.path;
  if (!path) return;

  // link text should have the focused leaf marks
  const leaf = getNodeLeaf(editor, path);

  // if text is empty, text is url
  if (!text?.length) {
    text = url;
  }

  insertLink(
    editor,
    {
      ...props,
      url,
      children: [
        {
          ...leaf,
          text,
        },
      ],
    },
    insertNodesOptions
  );
  return true;
};
