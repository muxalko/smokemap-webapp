import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { toast } from '@/components/ui/use-toast';
import { v4 as uuid } from 'uuid';

const tagVariants = cva(
    'transition-all border inline-flex items-center text-sm pl-2 rounded-md',
    {
        variants: {
            variant: {
                default:
                    'bg-secondary text-secondary-foreground hover:bg-secondary/80',
                primary:
                    'bg-primary border-primary text-primary-foreground hover:bg-primary/90',
                destructive:
                    'bg-destructive border-destructive text-destructive-foreground hover:bg-destructive/90',
            },
            size: {
                sm: 'text-xs h-7',
                md: 'text-sm h-8',
                lg: 'text-base h-9',
                xl: 'text-lg h-10',
            },
            shape: {
                default: 'rounded-sm',
                rounded: 'rounded-lg',
                square: 'rounded-none',
                pill: 'rounded-full',
            },
            borderStyle: {
                default: 'border-solid',
                none: 'border-none',
            },
            textCase: {
                uppercase: 'uppercase',
                lowercase: 'lowercase',
                capitalize: 'capitalize',
            },
            interaction: {
                clickable: 'cursor-pointer hover:shadow-md',
                nonClickable: 'cursor-default',
            },
            animation: {
                none: '',
                fadeIn: 'animate-fadeIn',
                slideIn: 'animate-slideIn',
                bounce: 'animate-bounce',
            },
            textStyle: {
                normal: 'font-normal',
                bold: 'font-bold',
                italic: 'italic',
                underline: 'underline',
                lineThrough: 'line-through',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'md',
            shape: 'default',
            borderStyle: 'default',
            textCase: 'capitalize',
            interaction: 'nonClickable',
            animation: 'fadeIn',
            textStyle: 'normal',
        },
    },
);

export enum Delimiter {
    Comma = ',',
    Enter = 'Enter',
    Space = ' ',
}

type OmittedInputProps = Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'size' | 'value'
>;

export type Tag = {
    id: string;
    text: string;
};

export interface TagInputProps
    extends OmittedInputProps,
        VariantProps<typeof tagVariants> {
    placeholder?: string;
    tags: Tag[];
    setTags: React.Dispatch<React.SetStateAction<Tag[]>>;
    enableAutocomplete?: boolean;
    autocompleteOptions?: Tag[];
    maxTags?: number;
    minTags?: number;
    readOnly?: boolean;
    disabled?: boolean;
    onTagAdd?: (tag: string) => void;
    onTagRemove?: (tag: string) => void;
    allowDuplicates?: boolean;
    validateTag?: (tag: string) => boolean;
    delimiter?: Delimiter;
    showCount?: boolean;
    placeholderWhenFull?: string;
    sortTags?: boolean;
    delimiterList?: string[];
    truncate?: number;
    minLength?: number;
    maxLength?: number;
    value?:
        | string
        | number
        | readonly string[]
        | { id: string; text: string }[];
    autocompleteFilter?: (option: string) => boolean;
    direction?: 'row' | 'column';
    onInputChange?: (value: string) => void;
    customTagRenderer?: (tag: Tag) => React.ReactNode;
    onFocus?: React.FocusEventHandler<HTMLInputElement>;
    onBlur?: React.FocusEventHandler<HTMLInputElement>;
    onTagClick?: (tag: Tag) => void;
}

const TagInput = React.forwardRef<HTMLInputElement, TagInputProps>(
    (props, ref) => {
        const {
            id,
            placeholder,
            tags,
            setTags,
            variant,
            size,
            shape,
            className,
            enableAutocomplete,
            autocompleteOptions,
            maxTags,
            delimiter = Delimiter.Comma,
            onTagAdd,
            onTagRemove,
            allowDuplicates,
            showCount,
            validateTag,
            placeholderWhenFull = 'Max tags reached',
            sortTags,
            delimiterList,
            truncate,
            autocompleteFilter,
            borderStyle,
            textCase,
            interaction,
            animation,
            textStyle,
            minLength,
            maxLength,
            direction = 'row',
            onInputChange,
            customTagRenderer,
            onFocus,
            onBlur,
            onTagClick,
        } = props;

        const [inputValue, setInputValue] = React.useState('');
        const [tagCount, setTagCount] = React.useState(
            Math.max(0, tags.length),
        );
        const inputRef = React.useRef<HTMLInputElement>(null);

        if (
            (maxTags !== undefined && maxTags < 0) ||
            (props.minTags !== undefined && props.minTags < 0)
        ) {
            console.warn('maxTags and minTags cannot be less than 0');
            toast({
                title: 'maxTags and minTags cannot be less than 0',
                description:
                    'Please set maxTags and minTags to a value greater than or equal to 0',
                variant: 'destructive',
            });
            return null;
        }

        const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const newValue = e.target.value;
            setInputValue(newValue);
            onInputChange?.(newValue);
        };

        const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (
                delimiterList
                    ? delimiterList.includes(e.key)
                    : e.key === delimiter || e.key === Delimiter.Enter
            ) {
                e.preventDefault();
                const newTagText = inputValue.trim();

                if (validateTag && !validateTag(newTagText)) {
                    return;
                }

                if (minLength && newTagText.length < minLength) {
                    console.warn('Tag is too short');
                    toast({
                        title: 'Tag is too short',
                        description: 'Please enter a tag with more characters',
                        variant: 'destructive',
                    });
                    return;
                }

                // Validate maxLength
                if (maxLength && newTagText.length > maxLength) {
                    toast({
                        title: 'Tag is too long',
                        description: 'Please enter a tag with less characters',
                        variant: 'destructive',
                    });
                    console.warn('Tag is too long');
                    return;
                }

                const newTagId = uuid();

                if (
                    newTagText &&
                    (allowDuplicates ||
                        !tags.some(tag => tag.text === newTagText)) &&
                    (maxTags === undefined || tags.length < maxTags)
                ) {
                    setTags([...tags, { id: newTagId, text: newTagText }]);
                    onTagAdd?.(newTagText);
                    setTagCount(prevTagCount => prevTagCount + 1);
                }
                setInputValue('');
            }
        };

        const removeTag = (idToRemove: string) => {
            setTags(tags.filter(tag => tag.id !== idToRemove));
            onTagRemove?.(tags.find(tag => tag.id === idToRemove)?.text || '');
            setTagCount(prevTagCount => prevTagCount - 1);
        };

        const filteredAutocompleteOptions = autocompleteFilter
            ? autocompleteOptions?.filter(option =>
                  autocompleteFilter(option.text),
              )
            : autocompleteOptions;

        const displayedTags = sortTags ? [...tags].sort() : tags;

        const truncatedTags = truncate
            ? tags.map(tag => ({
                  id: tag.id,
                  text:
                      tag.text?.length > truncate
                          ? `${tag.text.substring(0, truncate)}...`
                          : tag.text,
              }))
            : displayedTags;

        return (
            <div className="w-full">
                <div
                    className={cn(
                        'rounded-md',
                        {
                            'flex flex-wrap gap-2': direction === 'row',
                            'flex flex-col gap-2': direction === 'column',
                        },
                        { 'mb-3': tags.length !== 0 },
                    )}
                >
                    {truncatedTags.map(tagObj =>
                        customTagRenderer ? (
                            customTagRenderer(tagObj)
                        ) : (
                            <span
                                className={cn(
                                    tagVariants({
                                        variant,
                                        size,
                                        shape,
                                        borderStyle,
                                        textCase,
                                        interaction,
                                        animation,
                                        textStyle,
                                    }),
                                    {
                                        'justify-between':
                                            direction === 'column',
                                    },
                                )}
                                key={tagObj.id}
                                onClick={() => onTagClick?.(tagObj)}
                            >
                                {tagObj.text}
                                <Button
                                    className={cn(
                                        'py-1 px-3 h-full hover:bg-transparent',
                                    )}
                                    onClick={e => {
                                        e.stopPropagation(); // Prevent event from bubbling up to the tag span
                                        removeTag(tagObj.id);
                                    }}
                                    type="button"
                                    variant="ghost"
                                >
                                    <X size={14} />
                                </Button>
                            </span>
                        ),
                    )}
                </div>
                {enableAutocomplete ? (
                    <>
                        <Command className="border mt-2 sm:min-w-[450px]">
                            <CommandInput
                                disabled={
                                    maxTags !== undefined &&
                                    tags.length >= maxTags
                                }
                                onBlur={onBlur}
                                onFocus={onFocus}
                                placeholder={
                                    maxTags !== undefined &&
                                    tags.length >= maxTags
                                        ? placeholderWhenFull
                                        : placeholder
                                }
                            />
                            <CommandList>
                                <CommandEmpty>No results found.</CommandEmpty>
                                <CommandGroup heading="Suggestions">
                                    {filteredAutocompleteOptions?.map(
                                        optionObj => (
                                            <CommandItem
                                                className={`${
                                                    maxTags !== undefined &&
                                                    tags.length >= maxTags
                                                        ? 'cursor-not-allowed'
                                                        : 'cursor-pointer'
                                                }`}
                                                key={uuid()}
                                            >
                                                <div
                                                    className={`w-full ${
                                                        maxTags !== undefined &&
                                                        tags.length >= maxTags
                                                            ? 'cursor-not-allowed'
                                                            : 'cursor-pointer'
                                                    }`}
                                                    onClick={() => {
                                                        if (
                                                            optionObj.text &&
                                                            (allowDuplicates ||
                                                                !tags.some(
                                                                    tag =>
                                                                        tag.text ===
                                                                        optionObj.text,
                                                                )) &&
                                                            (maxTags ===
                                                                undefined ||
                                                                tags.length <
                                                                    maxTags)
                                                        ) {
                                                            setTags([
                                                                ...tags,
                                                                optionObj,
                                                            ]);
                                                            onTagAdd?.(
                                                                optionObj.text,
                                                            );
                                                            setTagCount(
                                                                prevTagCount =>
                                                                    prevTagCount +
                                                                    1,
                                                            );
                                                        }
                                                    }}
                                                >
                                                    {optionObj.text}
                                                </div>
                                            </CommandItem>
                                        ),
                                    )}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                        {maxTags && (
                            <div className="flex">
                                <span className="text-muted-foreground text-sm mt-1 ml-auto">
                                    {`${tagCount}`}/{`${maxTags}`}
                                </span>
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <Input
                            autoComplete={enableAutocomplete ? 'on' : 'off'}
                            className={className}
                            disabled={
                                maxTags !== undefined && tags.length >= maxTags
                            }
                            id={id}
                            list={
                                enableAutocomplete
                                    ? 'autocomplete-options'
                                    : undefined
                            }
                            onBlur={onBlur}
                            onChange={handleInputChange}
                            onFocus={onFocus}
                            onKeyDown={handleKeyDown}
                            placeholder={
                                maxTags !== undefined && tags.length >= maxTags
                                    ? placeholderWhenFull
                                    : placeholder
                            }
                            ref={inputRef}
                            type="text"
                            value={inputValue}
                        />
                        {showCount && maxTags && (
                            <div className="flex">
                                <span className="text-muted-foreground text-sm mt-1 ml-auto">
                                    {`${tagCount}`}/{`${maxTags}`}
                                </span>
                            </div>
                        )}
                    </>
                )}
            </div>
        );
    },
);

TagInput.displayName = 'TagInput';

export { TagInput };
