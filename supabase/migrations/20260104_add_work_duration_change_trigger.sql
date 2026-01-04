-- Legacy duration-only trigger cleanup and comprehensive work/split audit hooks

drop trigger if exists trg_log_work_duration_change on public.works;
drop function if exists public.log_work_duration_change();

-- =====================================================
-- WORK CHANGE AUDIT
-- =====================================================

create or replace function public.log_work_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
	actor uuid;
	new_json jsonb;
	old_json jsonb;
	key text;
	old_val text;
	new_val text;
	ignored_keys constant text[] := array['updated_at'];
begin
	if TG_OP = 'INSERT' then
		actor := coalesce(auth.uid(), NEW.created_by);

		insert into public.work_change_data (
			work_id,
			split_id,
			entity_type,
			changed_by,
			change_type,
			field_changed,
			old_value,
			new_value,
			notes
		) values (
			NEW.id,
			null,
			'work',
			actor,
			'work_create',
			'work',
			null,
			to_jsonb(NEW)::text,
			'Work created'
		);

		return NEW;
	elsif TG_OP = 'DELETE' then
		actor := coalesce(auth.uid(), OLD.created_by);

		insert into public.work_change_data (
			work_id,
			split_id,
			entity_type,
			changed_by,
			change_type,
			field_changed,
			old_value,
			new_value,
			notes
		) values (
			OLD.id,
			null,
			'work',
			actor,
			'work_delete',
			'work',
			to_jsonb(OLD)::text,
			null,
			'Work deleted'
		);

		return OLD;
	else
		actor := coalesce(auth.uid(), NEW.created_by, OLD.created_by);
		new_json := to_jsonb(NEW);
		old_json := to_jsonb(OLD);

		for key in select key from jsonb_object_keys(old_json || new_json)
		loop
			if key = any(ignored_keys) then
				continue;
			end if;

			if new_json -> key is distinct from old_json -> key then
				old_val := case when old_json ? key then old_json ->> key else null end;
				new_val := case when new_json ? key then new_json ->> key else null end;

				insert into public.work_change_data (
					work_id,
					split_id,
					entity_type,
					changed_by,
					change_type,
					field_changed,
					old_value,
					new_value,
					notes
				) values (
					NEW.id,
					null,
					'work',
					actor,
					'work_update',
					key,
					old_val,
					new_val,
					null
				);
			end if;
		end loop;

		return NEW;
	end if;
end;
$$;

drop trigger if exists trg_log_work_changes on public.works;

create trigger trg_log_work_changes
	after insert or update or delete on public.works
	for each row
	execute function public.log_work_changes();

-- =====================================================
-- WORK SPLIT CHANGE AUDIT
-- =====================================================

create or replace function public.log_work_split_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
	actor uuid;
	target_work uuid;
	split_identifier uuid;
	new_json jsonb;
	old_json jsonb;
	key text;
	old_val text;
	new_val text;
	ignored_keys constant text[] := array['updated_at'];
begin
	target_work := coalesce(NEW.work_id, OLD.work_id);
	split_identifier := coalesce(NEW.id, OLD.id);

	if TG_OP = 'INSERT' then
		actor := coalesce(auth.uid(), NEW.created_by);

		insert into public.work_change_data (
			work_id,
			split_id,
			entity_type,
			changed_by,
			change_type,
			field_changed,
			old_value,
			new_value,
			notes
		) values (
			target_work,
			split_identifier,
			'split',
			actor,
			'split_create',
			format('split.%s', split_identifier::text),
			null,
			to_jsonb(NEW)::text,
			'Split created'
		);

		return NEW;
	elsif TG_OP = 'DELETE' then
		actor := coalesce(auth.uid(), OLD.created_by);

		insert into public.work_change_data (
			work_id,
			split_id,
			entity_type,
			changed_by,
			change_type,
			field_changed,
			old_value,
			new_value,
			notes
		) values (
			target_work,
			split_identifier,
			'split',
			actor,
			'split_delete',
			format('split.%s', split_identifier::text),
			to_jsonb(OLD)::text,
			null,
			'Split deleted'
		);

		return OLD;
	else
		actor := coalesce(auth.uid(), NEW.created_by, OLD.created_by);
		new_json := to_jsonb(NEW);
		old_json := to_jsonb(OLD);

		for key in select key from jsonb_object_keys(old_json || new_json)
		loop
			if key = any(ignored_keys) then
				continue;
			end if;

			if new_json -> key is distinct from old_json -> key then
				old_val := case when old_json ? key then old_json ->> key else null end;
				new_val := case when new_json ? key then new_json ->> key else null end;

				insert into public.work_change_data (
					work_id,
					split_id,
					entity_type,
					changed_by,
					change_type,
					field_changed,
					old_value,
					new_value,
					notes
				) values (
					target_work,
					split_identifier,
					'split',
					actor,
					'split_update',
					format('split.%s.%s', split_identifier::text, key),
					old_val,
					new_val,
					null
				);
			end if;
		end loop;

		return NEW;
	end if;
end;
$$;

drop trigger if exists trg_log_work_split_changes on public.work_splits;

create trigger trg_log_work_split_changes
	after insert or update or delete on public.work_splits
	for each row
	execute function public.log_work_split_changes();
