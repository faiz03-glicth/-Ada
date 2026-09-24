import { fireEvent, screen } from '@testing-library/react-native';

import { SEED_ACTIVITIES } from '@/features/activities/config/seedActivities';
import { childrenOf, renderInScheme, SCHEMES, styleOf } from '@test/render';

import { ActivityBadge } from '../ActivityBadge';
import { ActivityGrid } from '../ActivityGrid';
import { ListRow } from '../ListRow';

describe.each(SCHEMES)('activity components in %s', (scheme) => {
  it('ActivityBadge tints with the activity colour', () => {
    const { theme, toJSON } = renderInScheme(
      <ActivityBadge activity={{ icon: 'dumbbell', color: 'orange' }} />,
      scheme,
    );
    const root = toJSON();
    expect(styleOf(childrenOf(root)[0]).backgroundColor).toBe(theme.activity.orange);
  });

  it('ActivityGrid (multi) exposes checkboxes and reports toggles', () => {
    const onToggle = jest.fn();
    renderInScheme(
      <ActivityGrid
        activities={SEED_ACTIVITIES}
        selectedIds={['workout']}
        selection="multi"
        onToggle={onToggle}
      />,
      scheme,
    );
    expect(screen.getAllByRole('checkbox')).toHaveLength(6);
    expect(screen.getByRole('checkbox', { name: 'Workout' }).props.accessibilityState).toEqual({
      checked: true,
    });
    expect(screen.getByRole('checkbox', { name: 'Walk' }).props.accessibilityState).toEqual({
      checked: false,
    });
    fireEvent.press(screen.getByRole('checkbox', { name: 'Walk' }));
    expect(onToggle).toHaveBeenCalledWith('walk');
  });

  it('ActivityGrid (single) uses radios and can show the New tile', () => {
    const onAddPress = jest.fn();
    renderInScheme(
      <ActivityGrid
        activities={SEED_ACTIVITIES.slice(0, 2)}
        selectedIds={['deep-work']}
        selection="single"
        onToggle={jest.fn()}
        showAdd
        onAddPress={onAddPress}
      />,
      scheme,
    );
    expect(screen.getByRole('radio', { name: 'Deep work' }).props.accessibilityState).toEqual({
      selected: true,
    });
    fireEvent.press(screen.getByRole('button', { name: 'New activity' }));
    expect(onAddPress).toHaveBeenCalled();
  });

  it('ListRow is a button when pressable and exposes its toggle by title', () => {
    const onPress = jest.fn();
    const onToggle = jest.fn();
    renderInScheme(
      <>
        <ListRow title="Log out" danger centered onPress={onPress} />
        <ListRow
          title="Daily reminder"
          icon="bell"
          iconColor="orange"
          trailing="toggle"
          toggleValue
          onToggle={onToggle}
        />
      </>,
      scheme,
    );
    fireEvent.press(screen.getByRole('button', { name: 'Log out' }));
    expect(onPress).toHaveBeenCalled();
    fireEvent(screen.getByLabelText('Daily reminder'), 'valueChange', false);
    expect(onToggle).toHaveBeenCalledWith(false);
  });
});
