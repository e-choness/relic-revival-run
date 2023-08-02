using UnityEngine;


public class PlayerController : MonoBehaviour
{
    private PlayerInput playerInput;
    private Rigidbody2D rigidBody;
    private SpriteRenderer spriteRenderer;
    [SerializeField] private GameObject pauseMenuUI;
    [SerializeField] private ContactFilter2D contactFilter;
    [SerializeField] private float jumpForce = 20.0f;
    [SerializeField] private float moveSpeed = 1.0f;
    private Vector2 moveVector;
    private bool isPaused;
    private bool IsGrounded => rigidBody.IsTouching(contactFilter);

    
    private void Awake()
    {
        playerInput = new PlayerInput();
        playerInput.Player.Jump.performed += context => OnJumpPerformed();
        playerInput.Player.Jump.canceled += context => OnJumpCanceled();
        playerInput.Player.Move.performed += context => moveVector = context.ReadValue<Vector2>();
        playerInput.Player.Move.canceled += context => moveVector = Vector2.zero;
        playerInput.Player.Menu.performed += context => OnPauseGame();
        playerInput.UI.Cancel.performed += context => OnResumeGame();

        rigidBody = GetComponent<Rigidbody2D>();
        spriteRenderer = GetComponent<SpriteRenderer>();
    }

    private void OnEnable()
    {
        playerInput.Player.Enable();
        pauseMenuUI.SetActive(false);
        isPaused = false;
    }

    private void OnDisable()
    {
        playerInput.Player.Disable();
    }

    private void OnPauseGame()
    {
        pauseMenuUI.SetActive(true);
        Time.timeScale = 0.0f;
        playerInput.Player.Disable();
        playerInput.UI.Enable();
        isPaused = true;
    }

    public void OnResumeGame()
    {
        pauseMenuUI.SetActive(false);
        Time.timeScale = 1.0f;
        playerInput.Player.Enable();
        playerInput.UI.Disable();
        isPaused = false;
    }

    private void FixedUpdate()
    {
        OnMovePerformed();
    }

    private void OnJumpPerformed()
    {
        
        if (IsGrounded)
        {
            rigidBody.velocity = new Vector2(rigidBody.velocity.x, jumpForce);
        }
    }

    private void OnJumpCanceled()
    {
        rigidBody.AddForce(Vector2.zero);
    }

    private void OnMovePerformed()
    {
        rigidBody.velocity = new Vector2(moveVector.x * moveSpeed, rigidBody.velocity.y);
        if (moveVector.x == 0)
        {
            // if(IsGrounded)
            // UpdateAnimation(MovementState.Idle);
        }
        else if (moveVector.x > 0)
        {
            // if (IsGrounded)
            //     UpdateAnimation(MovementState.Running);
            spriteRenderer.flipX = false;
        }
        else
        {
            // if (IsGrounded)
            //     UpdateAnimation(MovementState.Running);
            spriteRenderer.flipX = true;
        }

        // if (!IsGrounded)
        // {
        //     UpdateAnimation(_rigidbody2D.velocity.y > 0.1f ? MovementState.Jumping : MovementState.Falling);
        // }
    }

    private void OnTriggerEnter2D(Collider2D other)
    {
        var toolBox = GetComponentInChildren<ToolSelector>();
        var toolBoxIndex = toolBox.GetToolIndex();
        if(other.gameObject.CompareTag("PickUp"))
        {
            var spawn = other.gameObject.GetComponent<SpawnObjectScript>();
            var spawnIndex = spawn.spawnType;
            if(toolBoxIndex == spawnIndex)
                Destroy(other.gameObject);
        }
    }
}



